/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Calls a group of functions with the given parameters.
 * Errors are suppressed and aggregated, ensuring that nothing is thrown until all calls have completed.
 * This ensures that an error in one callback does not prevent later callbacks from completing.
 * @param funcs Callback functions to execute
 * @param args Arguments to pass to each callback
 */
export function callAll<T extends unknown[]>(funcs: Iterable<(...args: T) => void>, ...args: T): void {
	const errors: unknown[] = [];

	for (const func of funcs) {
		try {
			func(...args);
		} catch (err) {
			errors.push(err);
		}
	}

	if (errors.length > 0) {
		throw new AggregateError(errors);
	}
}

/**
 * Calls a single method across a group of object, passing the given parameters as values.
 * Errors are suppressed and aggregated, ensuring that nothing is thrown until all calls have completed.
 * This ensures that an error in one callback does not prevent later callbacks from completing.
 * @param objects Objects to execute methods on
 * @param method Name (property key) of the method to execute
 * @param args Arguments to pass
 */
export function callAllOn<TObject, TMethod extends MethodKeys<TObject>>(objects: Iterable<TObject>, method: TMethod, ...args: MethodParams<TObject, TMethod>): void {
	const errors: unknown[] = [];

	for (const object of objects) {
		try {
			// @ts-expect-error Our generic constraints ensure this is safe, but TS can't infer that much context.
			object[method](...args);
		} catch (err) {
			errors.push(err);
		}
	}

	if (errors.length > 0) {
		throw new AggregateError(errors);
	}
}

type AnyFunc = (...args: unknown[]) => unknown;
type Methods<TObject> = {
	[Key in keyof TObject]: TObject[Key] extends AnyFunc ? TObject[Key] : never;
};
type MethodKeys<TObject> = keyof Methods<TObject>;
type MethodParams<TObject, TMethod extends MethodKeys<TObject>> = TObject[TMethod] extends AnyFunc ? Parameters<TObject[TMethod]> : never;
