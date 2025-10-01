/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import { LoggerService } from '@/core/LoggerService.js';
import Logger from '@/logger.js';
import { ApLogService } from '@/core/ApLogService.js';
import { TimeService, type TimerHandle } from '@/core/TimeService.js';

// 10 minutes
export const scanInterval = 1000 * 60 * 10;

@Injectable()
export class ApLogCleanupService implements OnApplicationShutdown {
	private readonly logger: Logger;
	private scanTimer: TimerHandle | null = null;

	constructor(
		private readonly apLogService: ApLogService,
		private readonly timeService: TimeService,

		loggerService: LoggerService,
	) {
		this.logger = loggerService.getLogger('activity-log-cleanup');
	}

	@bindThis
	public async start(): Promise<void> {
		// Just in case start() gets called multiple times.
		this.dispose();

		// Prune at startup, in case the server was rebooted during the interval.
		// noinspection ES6MissingAwait
		this.tick();

		// Prune on a regular interval for the lifetime of the server.
		this.scanTimer = this.timeService.startTimer(this.tick, scanInterval, { repeated: true });
	}

	@bindThis
	private async tick(): Promise<void> {
		try {
			const affected = await this.apLogService.deleteExpiredLogs();
			this.logger.info(`Activity Log cleanup complete; removed ${affected} expired logs.`);
		} catch (err) {
			this.logger.error('Activity Log cleanup failed:', err as Error);
		}
	}

	@bindThis
	public onApplicationShutdown(): void {
		this.dispose();
	}

	@bindThis
	public dispose(): void {
		if (this.scanTimer) {
			this.timeService.stopTimer(this.scanTimer);
			this.scanTimer = null;
		}
	}
}
