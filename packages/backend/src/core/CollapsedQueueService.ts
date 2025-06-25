/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { LoggerService } from '@/core/LoggerService.js';
import type Logger from '@/logger.js';
import { CollapsedQueue } from '@/misc/collapsed-queue.js';
import { renderInlineError } from '@/misc/render-inline-error.js';
import { FederatedInstanceService } from '@/core/FederatedInstanceService.js';
import { EnvService } from '@/core/EnvService.js';
import { bindThis } from '@/decorators.js';
import type { MiInstance } from '@/models/Instance.js';

export type UpdateInstanceJob = {
	latestRequestReceivedAt: Date,
	shouldUnsuspend: boolean,
};

@Injectable()
export class CollapsedQueueService implements OnApplicationShutdown {
	// Moved from InboxProcessorService to allow access from ApInboxService
	public readonly updateInstanceQueue: CollapsedQueue<MiInstance['id'], UpdateInstanceJob>;

	private readonly logger: Logger;

	constructor(
		private readonly federatedInstanceService: FederatedInstanceService,
		private readonly envService: EnvService,

		loggerService: LoggerService,
	) {
		this.logger = loggerService.getLogger('collapsed-queue');
		this.updateInstanceQueue = new CollapsedQueue(
			'updateInstance',
			this.envService.env.NODE_ENV !== 'test' ? 60 * 1000 * 5 : 0,
			(oldJob, newJob) => this.collapseUpdateInstance(oldJob, newJob),
			(id, job) => this.performUpdateInstance(id, job),
			this.onQueueError,
		);
	}

	@bindThis
	private collapseUpdateInstance(oldJob: UpdateInstanceJob, newJob: UpdateInstanceJob) {
		const latestRequestReceivedAt = oldJob.latestRequestReceivedAt < newJob.latestRequestReceivedAt
			? newJob.latestRequestReceivedAt
			: oldJob.latestRequestReceivedAt;
		const shouldUnsuspend = oldJob.shouldUnsuspend || newJob.shouldUnsuspend;
		return {
			latestRequestReceivedAt,
			shouldUnsuspend,
		};
	}

	@bindThis
	private async performUpdateInstance(id: string, job: UpdateInstanceJob) {
		await this.federatedInstanceService.update(id, {
			latestRequestReceivedAt: new Date(),
			isNotResponding: false,
			// もしサーバーが死んでるために配信が止まっていた場合には自動的に復活させてあげる
			suspensionState: job.shouldUnsuspend ? 'none' : undefined,
		});
	}

	@bindThis
	async performAllNow() {
		this.logger.info('Persisting all collapsed queues...');

		await this.performQueue(this.updateInstanceQueue);

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

	async onApplicationShutdown() {
		await this.performAllNow();
	}
}
