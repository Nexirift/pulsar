/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { jest } from '@jest/globals';
import { callAll, callAllOn } from '@/misc/call-all.js';

describe(callAll, () => {
	it('should call all functions when all succeed', () => {
		const funcs = [
			jest.fn(() => {}),
			jest.fn(() => {}),
			jest.fn(() => {}),
		];

		callAll(funcs);

		for (const func of funcs) {
			expect(func).toHaveBeenCalledTimes(1);
		}
	});

	it('should pass parameters to all functions', () => {
		const funcs = [
			jest.fn((num: number) => expect(num).toBe(1)),
			jest.fn((num: number) => expect(num).toBe(1)),
			jest.fn((num: number) => expect(num).toBe(1)),
		];

		callAll(funcs, 1);
	});

	it('should call all functions when some fail', () => {
		const funcs = [
			jest.fn(() => { throw new Error(); }),
			jest.fn(() => {}),
			jest.fn(() => {}),
		];

		try {
			callAll(funcs);
		} catch {
			// ignore
		}

		for (const func of funcs) {
			expect(func).toHaveBeenCalledTimes(1);
		}
	});

	it('should throw when some functions fail', () => {
		const funcs = [
			jest.fn(() => { throw new Error(); }),
			jest.fn(() => {}),
			jest.fn(() => {}),
		];

		expect(() => callAll(funcs)).toThrow();
	});

	it('should not throw when input is empty', () => {
		expect(() => callAll([])).not.toThrow();
	});
});

describe(callAllOn, () => {
	it('should call all methods when all succeed', () => {
		const objects = [
			{ foo: jest.fn(() => {}) },
			{ foo: jest.fn(() => {}) },
			{ foo: jest.fn(() => {}) },
		];

		callAllOn(objects, 'foo');

		for (const object of objects) {
			expect(object.foo).toHaveBeenCalledTimes(1);
		}
	});

	it('should pass parameters to all methods', () => {
		const objects = [
			{ foo: jest.fn((num: number) => expect(num).toBe(1)) },
			{ foo: jest.fn((num: number) => expect(num).toBe(1)) },
			{ foo: jest.fn((num: number) => expect(num).toBe(1)) },
		];

		callAllOn(objects, 'foo', 1);
	});

	it('should call all methods when some fail', () => {
		const objects = [
			{ foo: jest.fn(() => {}) },
			{ foo: jest.fn(() => {}) },
			{ foo: jest.fn(() => {}) },
		];

		try {
			callAllOn(objects, 'foo');
		} catch {
			// ignore
		}

		for (const object of objects) {
			expect(object.foo).toHaveBeenCalledTimes(1);
		}
	});

	it('should throw when some methods fail', () => {
		const objects = [
			{ foo: jest.fn(() => { throw new Error(); }) },
			{ foo: jest.fn(() => {}) },
			{ foo: jest.fn(() => {}) },
		];

		expect(() => callAllOn(objects, 'foo')).toThrow();
	});

	it('should not throw when input is empty', () => {
		expect(() => callAllOn([] as { foo: () => void }[], 'foo')).not.toThrow();
	});
});
