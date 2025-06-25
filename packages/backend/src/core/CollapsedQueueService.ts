/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { LoggerService } from '@/core/LoggerService.js';
import type Logger from '@/logger.js';
import { CollapsedQueue } from '@/misc/collapsed-queue.js';
import { renderInlineError } from '@/misc/render-inline-error.js';
import { FederatedInstanceService } from '@/core/FederatedInstanceService.js';
import { EnvService } from '@/core/EnvService.js';
import { bindThis } from '@/decorators.js';
import type { MiInstance } from '@/models/Instance.js';
import { InternalEventService } from '@/core/InternalEventService.js';
import { MiUser } from '@/models/User.js';
import type { MiNote, UsersRepository, NotesRepository, MiAccessToken, AccessTokensRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';

export type UpdateInstanceJob = {
	latestRequestReceivedAt?: Date,
	notRespondingSince?: Date | null,
	shouldUnsuspend?: boolean,
	shouldSuspendGone?: boolean,
	shouldSuspendNotResponding?: boolean,
	notesCountDelta?: number,
	usersCountDelta?: number,
	followingCountDelta?: number,
	followersCountDelta?: number,
};

export type UpdateUserJob = {
	updatedAt?: Date,
	notesCountDelta?: number,
	followingCountDelta?: number,
	followersCountDelta?: number,
};

export type UpdateNoteJob = {
	repliesCountDelta?: number;
	renoteCountDelta?: number;
	clippedCountDelta?: number;
};

export type UpdateAccessTokenJob = {
	lastUsedAt: Date;
};

@Injectable()
export class CollapsedQueueService implements OnApplicationShutdown {
	// Moved from InboxProcessorService
	public readonly updateInstanceQueue: CollapsedQueue<MiInstance['id'], UpdateInstanceJob>;
	// Moved from NoteCreateService, NoteEditService, and NoteDeleteService
	public readonly updateUserQueue: CollapsedQueue<MiUser['id'], UpdateUserJob>;
	public readonly updateNoteQueue: CollapsedQueue<MiNote['id'], UpdateNoteJob>;
	public readonly updateAccessTokenQueue: CollapsedQueue<MiAccessToken['id'], UpdateAccessTokenJob>;

	private readonly logger: Logger;

	constructor(
		@Inject(DI.usersRepository)
		public readonly usersRepository: UsersRepository,

		@Inject(DI.notesRepository)
		public readonly notesRepository: NotesRepository,

		@Inject(DI.accessTokensRepository)
		public readonly accessTokensRepository: AccessTokensRepository,

		private readonly federatedInstanceService: FederatedInstanceService,
		private readonly envService: EnvService,
		private readonly internalEventService: InternalEventService,

		loggerService: LoggerService,
	) {
		this.logger = loggerService.getLogger('collapsed-queue');

		const fiveMinuteInterval = this.envService.env.NODE_ENV !== 'test' ? 60 * 1000 * 5 : 0;
		const oneMinuteInterval = this.envService.env.NODE_ENV !== 'test' ? 60 * 1000 : 0;

		this.updateInstanceQueue = new CollapsedQueue(
			'updateInstance',
			fiveMinuteInterval,
			(oldJob, newJob) => ({
				latestRequestReceivedAt: maxDate(oldJob.latestRequestReceivedAt, newJob.latestRequestReceivedAt),
				notRespondingSince: maxDate(oldJob.notRespondingSince, newJob.notRespondingSince),
				shouldUnsuspend: oldJob.shouldUnsuspend || newJob.shouldUnsuspend,
				notesCountDelta: (oldJob.notesCountDelta ?? 0) + (newJob.notesCountDelta ?? 0),
				usersCountDelta: (oldJob.usersCountDelta ?? 0) + (newJob.usersCountDelta ?? 0),
				followingCountDelta: (oldJob.followingCountDelta ?? 0) + (newJob.followingCountDelta ?? 0),
				followersCountDelta: (oldJob.followersCountDelta ?? 0) + (newJob.followersCountDelta ?? 0),
			}),
			(id, job) => this.federatedInstanceService.update(id, {
				// Direct update if defined
				latestRequestReceivedAt: job.latestRequestReceivedAt,

				// null (responding) > Date (not responding)
				notRespondingSince: job.latestRequestReceivedAt
					? null
					: job.notRespondingSince,

				// false (responding) > true (not responding)
				isNotResponding: job.latestRequestReceivedAt
					? false
					: job.notRespondingSince
						? true
						: undefined,

				// gone > none > auto
				suspensionState: job.shouldSuspendGone
					? 'goneSuspended'
					: job.shouldUnsuspend
						? 'none'
						: job.shouldSuspendNotResponding
							? 'autoSuspendedForNotResponding'
							: undefined,

				// Increment if defined
				notesCount: job.notesCountDelta ? () => `"notesCount" + ${job.notesCountDelta}` : undefined,
				usersCount: job.usersCountDelta ? () => `"usersCount" + ${job.usersCountDelta}` : undefined,
				followingCount: job.followingCountDelta ? () => `"followingCount" + ${job.followingCountDelta}` : undefined,
				followersCount: job.followersCountDelta ? () => `"followersCount" + ${job.followersCountDelta}` : undefined,
			}),
			{
				onError: this.onQueueError,
				concurrency: 2, // Low concurrency, this table is slow for some reason
			},
		);

		this.updateUserQueue = new CollapsedQueue(
			'updateUser',
			oneMinuteInterval,
			(oldJob, newJob) => ({
				updatedAt: maxDate(oldJob.updatedAt, newJob.updatedAt),
				notesCountDelta: (oldJob.notesCountDelta ?? 0) + (newJob.notesCountDelta ?? 0),
				followingCountDelta: (oldJob.followingCountDelta ?? 0) + (newJob.followingCountDelta ?? 0),
				followersCountDelta: (oldJob.followersCountDelta ?? 0) + (newJob.followersCountDelta ?? 0),
			}),
			(id, job) => this.usersRepository.update({ id }, {
				updatedAt: job.updatedAt,
				notesCount: job.notesCountDelta ? () => `"notesCount" + ${job.notesCountDelta}` : undefined,
				followingCount: job.followingCountDelta ? () => `"followingCount" + ${job.followingCountDelta}` : undefined,
				followersCount: job.followersCountDelta ? () => `"followersCount" + ${job.followersCountDelta}` : undefined,
			}),
			{
				onError: this.onQueueError,
				onPerform: (_, id) => this.internalEventService.emit('userUpdated', { id }),
				concurrency: 4, // High concurrency - this queue gets a lot of activity
			},
		);

		this.updateNoteQueue = new CollapsedQueue(
			'updateNote',
			oneMinuteInterval,
			(oldJob, newJob) => ({
				repliesCountDelta: (oldJob.repliesCountDelta ?? 0) + (newJob.repliesCountDelta ?? 0),
				renoteCountDelta: (oldJob.renoteCountDelta ?? 0) + (newJob.renoteCountDelta ?? 0),
				clippedCountDelta: (oldJob.clippedCountDelta ?? 0) + (newJob.clippedCountDelta ?? 0),
			}),
			(id, job) => this.notesRepository.update({ id }, {
				repliesCount: job.repliesCountDelta ? () => `"repliesCount" + ${job.repliesCountDelta}` : undefined,
				renoteCount: job.renoteCountDelta ? () => `"renoteCount" + ${job.renoteCountDelta}` : undefined,
				clippedCount: job.clippedCountDelta ? () => `"clippedCount" + ${job.clippedCountDelta}` : undefined,
			}),
			{
				onError: this.onQueueError,
				concurrency: 4, // High concurrency - this queue gets a lot of activity
			},
		);

		this.updateAccessTokenQueue = new CollapsedQueue(
			'updateAccessToken',
			fiveMinuteInterval,
			(oldJob, newJob) => ({
				lastUsedAt: maxDate(oldJob.lastUsedAt, newJob.lastUsedAt),
			}),
			(id, job) => this.accessTokensRepository.update({ id }, {
				lastUsedAt: job.lastUsedAt,
			}),
			{
				onError: this.onQueueError,
				concurrency: 2,
			},
		);

		this.internalEventService.on('userChangeDeletedState', this.onUserDeleted);
	}

	@bindThis
	async performAllNow() {
		this.logger.info('Persisting all collapsed queues...');

		await this.performQueue(this.updateInstanceQueue);
		await this.performQueue(this.updateUserQueue);
		await this.performQueue(this.updateNoteQueue);
		await this.performQueue(this.updateAccessTokenQueue);

		this.logger.info('Persistence complete.');
	}

	@bindThis
	private async performQueue<K, V>(queue: CollapsedQueue<K, V>): Promise<void> {
		try {
			const results = await queue.performAllNow();

			const [succeeded, failed] = results.reduce((counts, result) => {
				counts[result.status === 'fulfilled' ? 0 : 1]++;
				return counts;
			}, [0, 0]);

			this.logger.debug(`Persistence completed for ${queue.name}: ${succeeded} succeeded and ${failed} failed`);
		} catch (err) {
			this.logger.error(`Persistence failed for ${queue.name}: ${renderInlineError(err)}`);
		}
	}

	@bindThis
	private onQueueError<K, V>(queue: CollapsedQueue<K, V>, error: unknown): void {
		this.logger.error(`Error persisting ${queue.name}: ${renderInlineError(error)}`);
	}

	@bindThis
	private onUserDeleted(data: { id: string, isDeleted: boolean }) {
		if (data.isDeleted) {
			this.updateUserQueue.delete(data.id);
		}
	}

	async onApplicationShutdown() {
		this.internalEventService.off('userChangeDeletedState', this.onUserDeleted);

		await this.performAllNow();
	}
}

function maxDate(first: Date | undefined, second: Date): Date;
function maxDate(first: Date, second: Date | undefined): Date;
function maxDate(first: Date | undefined, second: Date | undefined): Date | undefined;
function maxDate(first: Date | null | undefined, second: Date | null | undefined): Date | null | undefined;

function maxDate(first: Date | null | undefined, second: Date | null | undefined): Date | null | undefined {
	if (first !== undefined && second !== undefined) {
		if (first != null && second != null) {
			if (first.getTime() > second.getTime()) {
				return first;
			} else {
				return second;
			}
		} else {
			// Null is considered infinitely in the future, and is therefore newer than any date.
			return null;
		}
	} else if (first !== undefined) {
		return first;
	} else if (second !== undefined) {
		return second;
	} else {
		// Undefined in considered infinitely in the past, and is therefore older than any date.
		return undefined;
	}
}
