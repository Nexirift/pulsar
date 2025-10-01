/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const captchaErrorCodes = {
	invalidProvider: Symbol('invalidProvider'),
	invalidParameters: Symbol('invalidParameters'),
	noResponseProvided: Symbol('noResponseProvided'),
	requestFailed: Symbol('requestFailed'),
	verificationFailed: Symbol('verificationFailed'),
	unknown: Symbol('unknown'),
} as const;
export type CaptchaErrorCode = typeof captchaErrorCodes[keyof typeof captchaErrorCodes];

export class CaptchaError extends Error {
	public readonly code: CaptchaErrorCode;
	public readonly cause?: unknown;

	constructor(code: CaptchaErrorCode, message: string, cause?: unknown) {
		super(message, cause ? { cause } : undefined);
		this.code = code;
		this.cause = cause;
		this.name = 'CaptchaError';
	}
}
