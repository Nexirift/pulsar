// /*
//  * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
//  * SPDX-License-Identifier: AGPL-3.0-only
//  */
//
// import { coreLogger, coreEnvService } from '@/boot/coreLogger.js';
// import { isError } from '@/misc/is-error.js';
// import { promiseTry } from '@/misc/promise-try.js';
// import type { EnvService } from '@/global/EnvService.js';
// import type Logger from '@/logger.js';
//
// // Make sure we only run it once!
// let haveRunPatch = false;
//
// // Back up the original unpatched implementations
// const nativeThen = Promise.prototype.then;
// const nativeCatch = Promise.prototype.catch;
// const nativeFinally = Promise.prototype.finally;
// const nativeReject = Promise.reject;
// const nativeTry = promiseTry; // native or polyfill
// const nativeWithResolvers = Promise.withResolvers;
//
// const isPatchedSymbol = Symbol('isPatched');
//
// function makePatched<T extends object>(target: T): T {
// 	setPatched(target, true);
// 	return target;
// }
//
// function setPatched(target: object, isPatched: boolean) {
// 	Reflect.set(target, isPatchedSymbol, isPatched);
// }
//
// function isPatched(target: object) {
// 	return Reflect.get(target, isPatchedSymbol) === true;
// }
//
// /**
//  * Patches the global Promise class and static methods to detect improper use.
//  */
// export function patchPromiseTypes(services?: { logger?: Logger, envService?: EnvService }) {
// 	const envService = services?.envService ?? coreEnvService;
// 	const logger = services?.logger ?? coreLogger;
//
// 	if (haveRunPatch) {
// 		logger.debug('Skipping patchPromiseTypes - already patched.');
// 		return;
// 	}
// 	haveRunPatch = true;
//
//
//
// 	logger.info('Promise debugging is enabled; the global Promise type will be patched with additional verification routines.');
//
//
// }
//
// export function installPromisePatches(logger: Logger) {
// 	// Defined here for access to services
// 	function check(
// 		error: unknown,
// 		promise: Promise<unknown> | null,
// 		continuation: {
// 			resolve?: ((result: unknown) => unknown) | null,
// 			reject?: ((error: unknown) => unknown) | null,
// 		},
// 	) {
// 		// instanceof checks are not reliable under jest!
// 		// https://github.com/jestjs/jest/issues/2549#issuecomment-2800060383
// 		if (!isError(error)) {
// 			const stack = new Error().stack;
// 			const type = error && typeof(error) === 'object' && 'name' in error && typeof(error.name) === 'string'
// 				? `object[${error.name}]`
// 				: typeof(error);
//
// 			logger.error(`Detected improper use of Promise: rejected with non-Error type ${type}`, { promise, error, stack, continuation });
// 		}
//
// 		if (String(error) === '#<Event>') {
// 			const stack = new Error().stack;
// 			logger.error('FOUND THE FUCKER:', { promise, error, stack, continuation });
// 		}
// 	}
//
// 	function patchCallback<TInput, TOutput, TCallback extends ((input: TInput) => Promise<TOutput>) | null | undefined>(
// 		callback: TCallback,
// 		checks: {
// 			input?: 'thrown' | 'returned' | 'both',
// 			output?: 'thrown' | 'returned' | 'both',
// 		},
// 		meta: {
// 			promise?: Promise<unknown>,
// 			continuation?: {
// 				resolve?: ((result: unknown) => unknown) | null,
// 				reject?: ((error: unknown) => unknown) | null,
// 			},
// 		},
// 	): TCallback {
// 		if (callback == null) {
// 			return callback;
// 		}
//
// 		if (isPatched(callback)) {
// 			return callback;
// 		}
//
// 		async function checkSomething<T = unknown>(thing: (() => T | Promise<T>), mode: undefined | 'returned' | 'thrown' | 'both'): Promise<T> {
// 			try {
// 				const returnedThing = await thing();
// 				if (mode === 'returned' || mode === 'both') {
// 					check(returnedThing, meta);
// 				}
// 				return returnedThing;
// 			} catch (thrownThing) {
// 				if (mode === 'thrown' || mode === 'both') {
// 					check(thrownThing, meta);
// 				}
// 				throw thrownThing;
// 			}
// 		}
//
// 		return makePatched(async (input: TInput): Promise<TOutput> => {
// 			// Check input asynchronously
// 			const returnedInput = await checkSomething(() => input, checks.input);
// 			return await checkSomething(() => callback(returnedInput), checks.output);
// 		}) as TCallback;
// 	}
//
// 	// function patchProducer<TOutput, TProducer extends (() => Promise<TOutput>) | null | undefined>(
// 	// 	producer: TProducer,
// 	// 	promise: Promise<unknown> | null,
// 	// 	continuation: {
// 	// 		resolve?: ((result: unknown) => unknown) | null,
// 	// 		reject?: ((error: unknown) => unknown) | null,
// 	// 	},
// 	// ): TProducer {
// 	// 	if (producer == null) {
// 	// 		return producer;
// 	// 	}
// 	//
// 	// 	if (isPatched(producer)) {
// 	// 		return producer;
// 	// 	}
// 	//
// 	// 	return makePatched(() => {
// 	// 		// Check the output
// 	// 		const result = nativeTry(producer);
// 	// 		result
// 	// 			.catch(resolvedError => {
// 	// 				check(resolvedError, promise, continuation);
// 	// 			});
// 	// 		return result;
// 	// 	}) as TProducer;
// 	// }
//
// 	// Defined here for access to services and check()
// 	class PatchedPromise<T> extends Promise<T> {
// 		constructor(executor: (resolve: (value: (PromiseLike<T> | T)) => void, reject: (reason?: unknown) => void) => void) {
// 			super((resolve, reject) => {
// 				reject = patchCallback(reject, { input: 'both' }, { promise: this });
// 				executor(resolve, reject);
// 			});
// 			setPatched(this, true);
// 		}
// 	}
// 	setPatched(PatchedPromise, true);
//
// 	logger.debug('Patching Promise.then prototype method...');
// 	Promise.prototype.then = makePatched(function<T, TResult1 = T, TResult2 = never>(this: Promise<T>, resolve?: ((value: T) => (PromiseLike<TResult1> | TResult1)) | undefined | null, reject?: ((reason: unknown) => (PromiseLike<TResult2> | TResult2)) | undefined | null): Promise<TResult1 | TResult2> {
// 		reject = patchCombined(reject, this, { resolve, reject });
// 		return nativeThen.call(this, resolve, reject) as Promise<TResult1 | TResult2>;
// 	});
//
// 	logger.debug('Patching Promise.catch prototype method...');
// 	Promise.prototype.catch = makePatched(function<T, TResult = never>(this: Promise<T>, reject?: ((reason: unknown) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult> {
// 		reject = patchCombined(reject, this, { reject });
// 		return nativeCatch.call(this, reject) as Promise<T | TResult>;
// 	});
//
// 	logger.debug('Patching Promise.finally prototype method...');
// 	Promise.prototype.finally = makePatched(function<T>(this: Promise<T>, _finally?: (() => Promise<void> | void) | undefined | null): Promise<T> {
// 		_finally = patchProducer(_finally, this, { resolve: _finally, reject: _finally });
// 		return nativeFinally.call(this, _finally) as Promise<T>;
// 	});
//
// 	logger.debug('Patching Promise.reject static method...');
// 	Promise.reject = patchCombined(nativeReject, null, {});
//
// 	logger.debug('Patching Promise.try static method...');
// 	Promise.try = makePatched(async <T, U extends unknown[]>(callbackFn: (...args: U) => T | PromiseLike<T>, ...args: U): Promise<Awaited<T>> => {
// 		const promise = nativeTry(callbackFn, ...args);
// 		try {
// 			return await promise;
// 		} catch (err) {
// 			check(err, promise, {}, 'source');
// 			throw err;
// 		}
// 	});
//
// 	logger.debug('Patching Promise.withResolvers static method...');
// 	Promise.withResolvers = makePatched(<T>(): PromiseWithResolvers<T> => {
// 		// let resolve: ((value: T | PromiseLike<T>) => void) | undefined = undefined;
// 		// let reject: ((reason?: unknown) => void) | undefined = undefined;
// 		// const promise = new PatchedPromise((resolver, rejecter) => {
// 		// 	resolve = resolver;
// 		// 	reject = rejecter;
// 		// });
// 		//
// 		// // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
// 		// return { resolve: resolve!, reject: reject!, promise } as PromiseWithResolvers<T>;
// 		const res = nativeWithResolvers<T>();
// 		if (isPatched(res.reject)) {
// 			return res;
// 		}
//
// 		const { promise, resolve, reject } = res;
// 		const patchedReject = async (err: unknown) => {
// 			check(await err, promise, {}, 'callback');
// 			reject(err);
// 		};
// 		return { promise, resolve, reject: patchedReject };
// 	});
//
// 	logger.debug('Patching Promise constructor...');
// 	// Copy all new static methods from Promise to PatchedPromise
// 	for (const prop of Reflect.ownKeys(Promise)) {
// 		const hasExisting = Reflect.getOwnPropertyDescriptor(PatchedPromise, prop) != null;
// 		if (hasExisting) continue;
//
// 		const value = Reflect.get(Promise, prop);
// 		if (typeof(value) !== 'function') continue;
//
// 		const descriptor = Reflect.getOwnPropertyDescriptor(Promise, prop);
// 		if (!descriptor) continue;
//
// 		Object.defineProperty(PatchedPromise, prop, descriptor);
// 	}
// 	// Replace Promise with PatchedPromise
// 	global.Promise = PatchedPromise;
// 	globalThis.Promise = PatchedPromise;
// }
