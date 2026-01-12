/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import push from 'web-push';
import * as Redis from 'ioredis';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import type { Packed } from '@/misc/json-schema.js';
import { getNoteSummary } from '@/misc/get-note-summary.js';
import type { MiMeta, MiSwSubscription, SwSubscriptionsRepository } from '@/models/_.js';
import { bindThis } from '@/decorators.js';
import { CacheManagementService, type ManagedQuantumKVCache } from '@/global/CacheManagementService.js';
import { TimeService } from '@/global/TimeService.js';
import { LoggerService } from '@/core/LoggerService.js';
import type { Logger } from '@/logger.js';

// Defined also packages/sw/types.ts#L13
type PushNotificationsTypes = {
	'notification': Packed<'Notification'>;
	'unreadAntennaNote': {
		antenna: { id: string, name: string };
		note: Packed<'Note'>;
	};
	'readAllNotifications': undefined;
	newChatMessage: Packed<'ChatMessage'>;
};

// Helper function to retry operations with DNS failures
async function retryWithBackoff<T>(
	operation: () => Promise<T>,
	maxRetries: number = 3,
	initialDelay: number = 1000,
): Promise<T> {
	let lastError: any;
	
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await operation();
		} catch (err: any) {
			lastError = err;
			
			// Check if it's a DNS error that might succeed on retry
			const isDnsError = err.code === 'EAI_AGAIN' || 
				err.code === 'ENOTFOUND' || 
				err.code === 'ETIMEDOUT' ||
				err.code === 'ECONNREFUSED' ||
				err.message?.includes('getaddrinfo');
			
			if (!isDnsError || attempt === maxRetries - 1) {
				throw err;
			}
			
			// Exponential backoff
			const delay = initialDelay * Math.pow(2, attempt);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
	
	throw lastError;
}

// Reduce length because push message servers have character limits
function truncateBody<T extends keyof PushNotificationsTypes>(type: T, body: PushNotificationsTypes[T]): PushNotificationsTypes[T] {
	if (typeof body !== 'object') return body;

	return {
		...body,
		...(('note' in body && body.note) ? {
			note: {
				...body.note,
				// textをgetNoteSummaryしたものに置き換える
				text: getNoteSummary(('type' in body && body.type === 'renote') ? body.note.renote as Packed<'Note'> : body.note),

				cw: undefined,
				reply: undefined,
				renote: undefined,
				user: type === 'notification' ? undefined as any : body.note.user,
			},
		} : {}),
	};
}

@Injectable()
export class PushNotificationService {
	private readonly subscriptionsCache: ManagedQuantumKVCache<MiSwSubscription[]>;
	private logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.meta)
		private meta: MiMeta,

		@Inject(DI.redis)
		private redisClient: Redis.Redis,

		@Inject(DI.swSubscriptionsRepository)
		private swSubscriptionsRepository: SwSubscriptionsRepository,

		private readonly timeService: TimeService,

		loggerService: LoggerService,
		cacheManagementService: CacheManagementService,
	) {
		this.logger = loggerService.getLogger('push-notification');
		this.subscriptionsCache = cacheManagementService.createQuantumKVCache<MiSwSubscription[]>('userSwSubscriptions', {
			lifetime: 1000 * 60 * 60 * 1, // 1h
			fetcher: async userId => await this.swSubscriptionsRepository.findBy({ userId }),
			// optionalFetcher not needed
			// bulkFetcher not needed
		});
	}

	@bindThis
	public async pushNotification<T extends keyof PushNotificationsTypes>(userId: string, type: T, body: PushNotificationsTypes[T]) {
		if (!this.meta.enableServiceWorker || this.meta.swPublicKey == null || this.meta.swPrivateKey == null) {
			this.logger.warn('Push notifications are disabled or not configured properly');
			return;
		}

		// アプリケーションの連絡先と、サーバーサイドの鍵ペアの情報を登録
		push.setVapidDetails(this.config.url,
			this.meta.swPublicKey,
			this.meta.swPrivateKey);

		const subscriptions = await this.subscriptionsCache.fetch(userId);

		if (subscriptions.length === 0) {
			this.logger.debug(`No push subscriptions found for user ${userId}`);
			return;
		}

		// Send all notifications concurrently and handle failures individually
		const promises = subscriptions.map(async (subscription) => {
			if ([
				'readAllNotifications',
			].includes(type) && !subscription.sendReadMessage) return;

			const pushSubscription = {
				endpoint: subscription.endpoint,
				keys: {
					auth: subscription.auth,
					p256dh: subscription.publickey,
				},
			};

			try {
				await retryWithBackoff(async () => {
					return await push.sendNotification(pushSubscription, JSON.stringify({
						type,
						body: (type === 'notification' || type === 'unreadAntennaNote') ? truncateBody(type, body) : body,
						userId,
						dateTime: this.timeService.now,
					}), {
						proxy: this.config.proxy,
					});
				});
				this.logger.debug(`Push notification sent successfully to ${subscription.endpoint}`);
			} catch (err: any) {
				// Log the full error with all available details
				const errorDetails: any = {
					endpoint: subscription.endpoint,
					statusCode: err.statusCode,
					message: err.message,
					name: err.name,
					code: err.code,
				};

				// Include HTTP-specific details if available
				if (err.statusCode) {
					errorDetails.headers = err.headers;
					errorDetails.body = err.body;
				}

				// Include stack trace for non-HTTP errors
				if (!err.statusCode) {
					errorDetails.stack = err.stack;
				}

				// Special handling for DNS errors
				const isDnsError = err.code === 'EAI_AGAIN' || 
					err.code === 'ENOTFOUND' || 
					err.message?.includes('getaddrinfo');
				
				if (isDnsError) {
					this.logger.error(
						`DNS resolution failed for push notification endpoint (this may indicate DNS or network issues)`,
						errorDetails,
					);
				} else {
					this.logger.error(
						`Failed to send push notification: ${err.statusCode ? `HTTP ${err.statusCode}` : err.message || err.name || 'Unknown error'}`,
						errorDetails,
					);
				}

				if (err.statusCode === 410) {
					this.logger.info(`Removing expired subscription for user ${userId}`);
					await this.swSubscriptionsRepository.delete({
						userId: userId,
						endpoint: subscription.endpoint,
						auth: subscription.auth,
						publickey: subscription.publickey,
					});
					await this.refreshCache(userId);
				}
			}
		});

		await Promise.allSettled(promises);
	}

	@bindThis
	public async refreshCache(userId: string): Promise<void> {
		await this.subscriptionsCache.refresh(userId);
	}
}
