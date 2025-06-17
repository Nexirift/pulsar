/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as Bull from 'bullmq';
import { BackgroundTaskJobData, UpdateFeaturedBackgroundTask, UpdateInstanceBackgroundTask, UpdateUserBackgroundTask } from '@/queue/types.js';
import { ApPersonService } from '@/core/activitypub/models/ApPersonService.js';
import { QueueLoggerService } from '@/queue/QueueLoggerService.js';
import Logger from '@/logger.js';
import { isRetryableError } from '@/misc/is-retryable-error.js';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { CacheService } from '@/core/CacheService.js';
import { FederatedInstanceService } from '@/core/FederatedInstanceService.js';
import { FetchInstanceMetadataService } from '@/core/FetchInstanceMetadataService.js';
import { renderInlineError } from '@/misc/render-inline-error.js';

@Injectable()
export class BackgroundTaskProcessorService {
	private readonly logger: Logger;

	constructor(
		@Inject(DI.config)
		private readonly config: Config,

		private readonly apPersonService: ApPersonService,
		private readonly cacheService: CacheService,
		private readonly federatedInstanceService: FederatedInstanceService,
		private readonly fetchInstanceMetadataService: FetchInstanceMetadataService,

		queueLoggerService: QueueLoggerService,
	) {
		this.logger = queueLoggerService.logger.createSubLogger('background-task');
	}

	public async process(job: Bull.Job<BackgroundTaskJobData>): Promise<string> {
		if (job.data.type === 'update-user') {
			return await this.processUpdateUser(job.data);
		} else if (job.data.type === 'update-featured') {
			return await this.processUpdateFeatured(job.data);
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		} else if (job.data.type === 'update-instance') {
			return await this.processUpdateInstance(job.data);
		} else {
			this.logger.warn(`Can't process unknown job type "${job.data}"; this is likely a bug. Full job data:`, job.data);
			throw new Error(`Unknown job type ${job.data}, see system logs for details`);
		}
	}

	private async processUpdateUser(task: UpdateUserBackgroundTask): Promise<string> {
		const user = await this.cacheService.findOptionalUserById(task.userId);
		if (!user || user.isDeleted) return `Skipping update-user task: user ${task.userId} has been deleted`;
		if (user.isSuspended) return `Skipping update-user task: user ${task.userId} is suspended`;
		if (!user.uri) return `Skipping update-user task: user ${task.userId} is local`;

		if (user.lastFetchedAt && Date.now() - user.lastFetchedAt.getTime() < 1000 * 60 * 60 * 24) {
			return `Skipping update-user task: user ${task.userId} was recently updated`;
		}

		await this.apPersonService.updatePerson(user.uri);
		return 'ok';
	}

	private async processUpdateFeatured(task: UpdateFeaturedBackgroundTask): Promise<string> {
		const user = await this.cacheService.findOptionalUserById(task.userId);
		if (!user || user.isDeleted) return `Skipping update-featured task: user ${task.userId} has been deleted`;
		if (user.isSuspended) return `Skipping update-featured task: user ${task.userId} is suspended`;
		if (!user.uri) return `Skipping update-featured task: user ${task.userId} is local`;
		if (!user.featured) return `Skipping update-featured task: user ${task.userId} has no featured collection`;

		if (user.lastFetchedAt && Date.now() - user.lastFetchedAt.getTime() < 1000 * 60 * 60 * 24) {
			return `Skipping update-featured task: user ${task.userId} was recently updated`;
		}

		await this.apPersonService.updateFeatured(user);
		return 'ok';
	}

	private async processUpdateInstance(task: UpdateInstanceBackgroundTask): Promise<string> {
		const instance = await this.federatedInstanceService.fetch(task.host);
		if (!instance) return `Skipping update-instance task: instance ${task.host} has been deleted`;
		if (instance.isBlocked) return `Skipping update-instance task: instance ${task.host} is blocked`;

		if (instance.infoUpdatedAt && Date.now() - instance.infoUpdatedAt.getTime() < 1000 * 60 * 60 * 24) {
			return `Skipping update-instance task: instance ${task.host} was recently updated`;
		}

		await this.fetchInstanceMetadataService.fetchInstanceMetadata(instance);
		return 'ok';
	}
}
