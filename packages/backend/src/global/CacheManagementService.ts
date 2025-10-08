/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as Redis from 'ioredis';
import {
	MemoryKVCache,
	MemorySingleCache,
	RedisKVCache,
	RedisSingleCache,
	type RedisKVCacheOpts,
	type RedisSingleCacheOpts,
} from '@/misc/cache.js';
import { QuantumKVCache, type QuantumKVOpts } from '@/misc/QuantumKVCache.js';
import { bindThis } from '@/decorators.js';
import { DI } from '@/di-symbols.js';
import { TimeService, type TimerHandle } from '@/global/TimeService.js';
import { InternalEventService } from '@/global/InternalEventService.js';

// This is the one place that's *supposed* to new() up caches.
/* eslint-disable no-restricted-syntax */

export type ManagedMemoryKVCache<T> = Managed<MemoryKVCache<T>>;
export type ManagedMemorySingleCache<T> = Managed<MemorySingleCache<T>>;
export type ManagedRedisKVCache<T> = Managed<RedisKVCache<T>>;
export type ManagedRedisSingleCache<T> = Managed<RedisSingleCache<T>>;
export type ManagedQuantumKVCache<T> = Managed<QuantumKVCache<T>>;

export type Managed<T> = Omit<T, 'dispose' | 'onApplicationShutdown' | 'gc'>;
export type Manager = { dispose(): void, clear(): void, gc(): void };

export const GC_INTERVAL = 1000 * 60 * 3; // 3m

/**
 * Creates and "manages" instances of any standard cache type.
 * Instances produced by this class are automatically tracked for disposal when the application shuts down.
 */
@Injectable()
export class CacheManagementService implements OnApplicationShutdown {
	private readonly managedCaches = new Set<Manager>();
	private gcTimer?: TimerHandle | null;

	constructor(
		@Inject(DI.redis)
		private readonly redisClient: Redis.Redis,

		private readonly timeService: TimeService,
		private readonly internalEventService: InternalEventService,
	) {}

	private get cacheServices() {
		return {
			internalEventService: this.internalEventService,
			redisClient: this.redisClient,
			timeService: this.timeService,
		};
	}

	@bindThis
	public createMemoryKVCache<T>(lifetime: number): ManagedMemoryKVCache<T> {
		const cache = new MemoryKVCache<T>(lifetime, this.cacheServices);
		return this.manageCache(cache);
	}

	@bindThis
	public createMemorySingleCache<T>(lifetime: number): ManagedMemorySingleCache<T> {
		const cache = new MemorySingleCache<T>(lifetime, this.cacheServices);
		return this.manageCache(cache);
	}

	@bindThis
	public createRedisKVCache<T>(name: string, opts: RedisKVCacheOpts<T>): ManagedRedisKVCache<T> {
		const cache = new RedisKVCache<T>(name, this.cacheServices, opts);
		return this.manageCache(cache);
	}

	@bindThis
	public createRedisSingleCache<T>(name: string, opts: RedisSingleCacheOpts<T>): ManagedRedisSingleCache<T> {
		const cache = new RedisSingleCache<T>(name, this.cacheServices, opts);
		return this.manageCache(cache);
	}

	@bindThis
	public createQuantumKVCache<T>(name: string, opts: QuantumKVOpts<T>): ManagedQuantumKVCache<T> {
		const cache = new QuantumKVCache<T>(name, this.cacheServices, opts);
		return this.manageCache(cache);
	}

	protected manageCache<T extends Manager>(cache: T): Managed<T> {
		this.managedCaches.add(cache);
		this.startGcTimer();
		return cache;
	}

	@bindThis
	public gc(): void {
		this.resetGcTimer(() => {
			// TODO callAll()
			for (const manager of this.managedCaches) {
				manager.gc();
			}
		});
	}

	@bindThis
	public clear(): void {
		this.resetGcTimer(() => {
			for (const manager of this.managedCaches) {
				manager.clear();
			}
		});
	}

	@bindThis
	public async dispose(): Promise<void> {
		this.stopGcTimer();
		for (const manager of this.managedCaches) {
			manager.dispose();
		}
		this.managedCaches.clear();
	}

	@bindThis
	public async onApplicationShutdown(): Promise<void> {
		await this.dispose();
	}

	@bindThis
	private startGcTimer() {
		// Only start it once, and don't *re* start since this gets called repeatedly.
		this.gcTimer ??= this.timeService.startTimer(this.gc, GC_INTERVAL, { repeated: true });
	}

	@bindThis
	private stopGcTimer() {
		// Only stop it once, then clear the value so it can be restarted later.
		if (this.gcTimer != null) {
			this.timeService.stopTimer(this.gcTimer);
			this.gcTimer = null;
		}
	}

	@bindThis
	private resetGcTimer(onBlank?: () => void): void {
		this.stopGcTimer();

		try {
			if (onBlank) {
				onBlank();
			}
		} finally {
			this.startGcTimer();
		}
	}
}
