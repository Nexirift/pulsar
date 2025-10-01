/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { jest } from '@jest/globals';
import { MockRedis } from '../../misc/MockRedis.js';
import { GodOfTimeService } from '../../misc/GodOfTimeService.js';
import { CacheManagementService, type Manager } from '@/core/CacheManagementService.js';
import { InternalEventService } from '@/core/InternalEventService.js';
import { MemoryKVCache } from '@/misc/cache.js';

describe(CacheManagementService, () => {
	let timeService: GodOfTimeService;
	let redisClient: MockRedis;
	let internalEventService: InternalEventService;

	let serviceUnderTest: CacheManagementService;
	let internalsUnderTest: { managedCaches: Set<Manager> };

	beforeEach(() => {
		timeService = new GodOfTimeService();
		timeService.resetToNow();
		redisClient = new MockRedis(timeService);
		internalEventService = new InternalEventService(redisClient, redisClient, { host: 'example.com' });

		serviceUnderTest = new CacheManagementService(redisClient, timeService, internalEventService);
		internalsUnderTest = { managedCaches: Reflect.get(serviceUnderTest, 'managedCaches') };
	});

	afterEach(() => {
		timeService.reset();
		serviceUnderTest.dispose();
		internalEventService.dispose();
		redisClient.disconnect();
	});

	describe('createMemoryKVCache', () => testCreate('createMemoryKVCache', Infinity));
	describe('createMemorySingleCache', () => testCreate('createMemorySingleCache', Infinity));
	describe('createRedisKVCache', () => testCreate('createRedisKVCache', 'redis', { lifetime: Infinity, memoryCacheLifetime: Infinity }));
	describe('createRedisSingleCache', () => testCreate('createRedisSingleCache', 'single', { lifetime: Infinity, memoryCacheLifetime: Infinity }));
	describe('createQuantumKVCache', () => testCreate('createQuantumKVCache', 'quantum', { lifetime: Infinity, fetcher: () => { throw new Error('not implement'); } }));

	describe('clear', () => testClear('clear', false));
	describe('dispose', () => testClear('dispose', true));
	describe('onApplicationShutdown', () => testClear('onApplicationShutdown', true));

	function testCreate<Func extends 'createMemoryKVCache' | 'createMemorySingleCache' | 'createRedisKVCache' | 'createRedisSingleCache' | 'createQuantumKVCache', Value>(func: Func, ...args: Parameters<CacheManagementService[Func]>) {
		// @ts-expect-error TypeScript bug: https://github.com/microsoft/TypeScript/issues/57322
		const act = () => serviceUnderTest[func]<Value>(...args);

		it('should construct a cache', () => {
			const cache = act();

			expect(cache).not.toBeNull();
		});

		it('should track reference', () => {
			const cache = act();

			expect(internalsUnderTest.managedCaches).toContain(cache);
		});
	}

	function testClear(func: 'clear' | 'dispose' | 'onApplicationShutdown', shouldDispose: boolean) {
		function act() {
			serviceUnderTest[func]();
		}

		it('should clear managed caches', () => {
			const cache = serviceUnderTest.createMemoryKVCache<string>(Infinity);
			const clear = jest.spyOn(cache, 'clear');

			act();

			expect(clear).toHaveBeenCalled();
		});

		it(`should${shouldDispose ? ' ' : ' not '}dispose managed caches`, () => {
			const cache = serviceUnderTest.createMemoryKVCache<string>(Infinity);
			const dispose = jest.spyOn(cache as MemoryKVCache<string>, 'dispose');

			act();

			if (shouldDispose) {
				expect(dispose).toHaveBeenCalled();
			} else {
				expect(dispose).not.toHaveBeenCalled();
			}
		});

		it('should not error with nothing to do', () => {
			act();
		});

		it('should be callable multiple times', () => {
			const cache = serviceUnderTest.createMemoryKVCache<string>(Infinity);
			const clear = jest.spyOn(cache, 'clear');

			act();
			act();
			act();

			const expected = shouldDispose ? 1 : 3;
			expect(clear).toHaveBeenCalledTimes(expected);
		});

		it(`should${shouldDispose ? ' ' : ' not '}deref caches`, () => {
			const cache = serviceUnderTest.createMemoryKVCache<string>(Infinity);

			act();

			if (shouldDispose) {
				expect(internalsUnderTest.managedCaches).not.toContain(cache);
			} else {
				expect(internalsUnderTest.managedCaches).toContain(cache);
			}
		});

		it(`should${shouldDispose ? ' ' : ' not '}reset cache list`, () => {
			serviceUnderTest.createMemoryKVCache<string>(Infinity);

			act();

			if (shouldDispose) {
				expect(internalsUnderTest.managedCaches.size).toBe(0);
			} else {
				expect(internalsUnderTest.managedCaches.size).not.toBe(0);
			}
		});
	}
});
