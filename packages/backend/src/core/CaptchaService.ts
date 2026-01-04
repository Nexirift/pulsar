/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { createHash, createHmac } from 'node:crypto';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { bindThis } from '@/decorators.js';
import { MetaService } from '@/core/MetaService.js';
import { MiMeta } from '@/models/Meta.js';
import Logger from '@/logger.js';
import { LoggerService } from '@/core/LoggerService.js';
import { CaptchaError, captchaErrorCodes } from '@/misc/captcha-error.js';

export { CaptchaError } from '@/misc/captcha-error.js';

export const supportedCaptchaProviders = ['none', 'hcaptcha', 'mcaptcha', 'recaptcha', 'turnstile', 'altcha', 'fc', 'testcaptcha'] as const;
export type CaptchaProvider = typeof supportedCaptchaProviders[number];

export type CaptchaSetting = {
	provider: CaptchaProvider;
	hcaptcha: {
		siteKey: string | null;
		secretKey: string | null;
	}
	mcaptcha: {
		siteKey: string | null;
		secretKey: string | null;
		instanceUrl: string | null;
	}
	recaptcha: {
		siteKey: string | null;
		secretKey: string | null;
	}
	turnstile: {
		siteKey: string | null;
		secretKey: string | null;
	}
	altcha: {
		siteKey: string | null;
		secretKey: string | null;
		instanceUrl: string | null;
	}
	fc: {
		siteKey: string | null;
		secretKey: string | null;
	}
};

export type CaptchaSaveSuccess = {
	success: true;
};
export type CaptchaSaveFailure = {
	success: false;
	error: CaptchaError;
};
export type CaptchaSaveResult = CaptchaSaveSuccess | CaptchaSaveFailure;

type CaptchaResponse = {
	success: boolean;
	'error-codes'?: string[];
	'errors'?: string[];
};

@Injectable()
export class CaptchaService {
	private readonly logger: Logger;

	constructor(
		private httpRequestService: HttpRequestService,
		private metaService: MetaService,
		loggerService: LoggerService,
	) {
		this.logger = loggerService.getLogger('captcha');
	}

	@bindThis
	private async getCaptchaResponse(url: string, secret: string, response: string): Promise<CaptchaResponse> {
		const params = new URLSearchParams({
			secret,
			response,
		});

		const res = await this.httpRequestService.send(url, {
			method: 'POST',
			body: params.toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		}, { throwErrorWhenResponseNotOk: false });

		if (!res.ok) {
			throw new Error(`${res.status}`);
		}

		return await res.json() as CaptchaResponse;
	}

	@bindThis
	public async verifyRecaptcha(secret: string, response: string | null | undefined): Promise<void> {
		if (response == null) {
			throw new CaptchaError(captchaErrorCodes.noResponseProvided, 'recaptcha-failed: no response provided');
		}

		const result = await this.getCaptchaResponse('https://www.recaptcha.net/recaptcha/api/siteverify', secret, response).catch(err => {
			throw new CaptchaError(captchaErrorCodes.requestFailed, `recaptcha-request-failed: ${err}`, err);
		});

		if (result.success !== true) {
			const errorCodes = result['error-codes'] ? result['error-codes'].join(', ') : '';
			throw new CaptchaError(captchaErrorCodes.verificationFailed, `recaptcha-failed: ${errorCodes}`);
		}
	}

	@bindThis
	public async verifyHcaptcha(secret: string, response: string | null | undefined): Promise<void> {
		if (response == null) {
			throw new CaptchaError(captchaErrorCodes.noResponseProvided, 'hcaptcha-failed: no response provided');
		}

		const result = await this.getCaptchaResponse('https://hcaptcha.com/siteverify', secret, response).catch(err => {
			throw new CaptchaError(captchaErrorCodes.requestFailed, `hcaptcha-request-failed: ${err}`, err);
		});

		if (result.success !== true) {
			const errorCodes = result['error-codes'] ? result['error-codes'].join(', ') : '';
			throw new CaptchaError(captchaErrorCodes.verificationFailed, `hcaptcha-failed: ${errorCodes}`);
		}
	}

	@bindThis
	public async verifyFriendlyCaptcha(secret: string, response: string | null | undefined): Promise<void> {
		if (response == null) {
			throw new CaptchaError(captchaErrorCodes.noResponseProvided, 'frc-failed: no response provided');
		}

		const result = await this.httpRequestService.send('https://api.friendlycaptcha.com/api/v1/siteverify', {
			method: 'POST',
			body: JSON.stringify({
				secret: secret,
				solution: response,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		}, { throwErrorWhenResponseNotOk: false });

		if (result.status !== 200) {
			throw new CaptchaError(captchaErrorCodes.requestFailed, `frc-request-failed: ${result.status}`);
		}

		const resp = await result.json() as CaptchaResponse;

		if (resp.success !== true) {
			const errorCodes = resp['errors'] ? resp['errors'].join(', ') : '';
			throw new CaptchaError(captchaErrorCodes.verificationFailed, `frc-failed: ${errorCodes}`);
		}
	}

	// https://codeberg.org/Gusted/mCaptcha/src/branch/main/mcaptcha.go
	@bindThis
	public async verifyMcaptcha(secret: string, siteKey: string, instanceHost: string, response: string | null | undefined): Promise<void> {
		if (response == null) {
			throw new CaptchaError(captchaErrorCodes.noResponseProvided, 'mcaptcha-failed: no response provided');
		}

		const endpointUrl = new URL('/api/v1/pow/siteverify', instanceHost);
		const result = await this.httpRequestService.send(endpointUrl.toString(), {
			method: 'POST',
			body: JSON.stringify({
				key: siteKey,
				secret: secret,
				token: response,
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		}, { throwErrorWhenResponseNotOk: false });

		if (result.status !== 200) {
			throw new CaptchaError(captchaErrorCodes.requestFailed, 'mcaptcha-failed: mcaptcha didn\'t return 200 OK');
		}

		const resp = (await result.json()) as { valid: boolean };

		if (!resp.valid) {
			throw new CaptchaError(captchaErrorCodes.verificationFailed, 'mcaptcha-request-failed');
		}
	}

	@bindThis
	public async verifyTurnstile(secret: string, response: string | null | undefined): Promise<void> {
		if (response == null) {
			throw new CaptchaError(captchaErrorCodes.noResponseProvided, 'turnstile-failed: no response provided');
		}

		const result = await this.getCaptchaResponse('https://challenges.cloudflare.com/turnstile/v0/siteverify', secret, response).catch(err => {
			throw new CaptchaError(captchaErrorCodes.requestFailed, `turnstile-request-failed: ${err}`, err);
		});

		if (result.success !== true) {
			const errorCodes = result['error-codes'] ? result['error-codes'].join(', ') : '';
			throw new CaptchaError(captchaErrorCodes.verificationFailed, `turnstile-failed: ${errorCodes}`);
		}
	}

	@bindThis
	public async verifyAltcha(secret: string, instanceHost: string | null, response: string | null | undefined): Promise<void> {
		if (response == null) {
			throw new CaptchaError(captchaErrorCodes.noResponseProvided, 'altcha-failed: no response provided');
		}

		// Determine verification mode based on instanceHost and secret
		if (instanceHost) {
			// Sentinel mode: verify server signature via Sentinel API
			const endpointUrl = new URL('/v1/verify/signature', instanceHost);
			const result = await this.httpRequestService.send(endpointUrl.toString(), {
				method: 'POST',
				body: JSON.stringify({
					payload: response,
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			}, { throwErrorWhenResponseNotOk: false });

			if (result.status !== 200) {
				throw new CaptchaError(captchaErrorCodes.requestFailed, `altcha-request-failed: ${result.status}`);
			}

			const resp = await result.json() as { verified: boolean };

			if (resp.verified !== true) {
				throw new CaptchaError(captchaErrorCodes.verificationFailed, 'altcha-failed');
			}
		} else if (this.isUrl(secret)) {
			// Custom server mode with external verification endpoint
			try {
				const result = await this.httpRequestService.send(secret, {
					method: 'POST',
					body: JSON.stringify({
						payload: response,
					}),
					headers: {
						'Content-Type': 'application/json',
					},
				}, { throwErrorWhenResponseNotOk: false });

				if (result.status !== 200) {
					throw new CaptchaError(captchaErrorCodes.requestFailed, `altcha-request-failed: ${result.status}`);
				}

				const resp = await result.json() as { verified: boolean };

				if (resp.verified !== true) {
					throw new CaptchaError(captchaErrorCodes.verificationFailed, 'altcha-failed');
				}
			} catch (err) {
				if (err instanceof CaptchaError) throw err;
				throw new CaptchaError(captchaErrorCodes.verificationFailed, `altcha-failed: ${err}`);
			}
		} else {
			// Custom server mode with local HMAC verification
			try {
				const payloadObj = JSON.parse(Buffer.from(response, 'base64').toString('utf-8'));
				
				// Verify HMAC signature
				const expectedSignature = this.computeHmac(secret, payloadObj.challenge);
				if (expectedSignature !== payloadObj.signature) {
					throw new CaptchaError(captchaErrorCodes.verificationFailed, 'altcha-failed: invalid signature');
				}

				// Verify solution
				const solutionHash = this.computeHash(payloadObj.salt + payloadObj.number);
				if (solutionHash !== payloadObj.challenge) {
					throw new CaptchaError(captchaErrorCodes.verificationFailed, 'altcha-failed: invalid solution');
				}
			} catch (err) {
				if (err instanceof CaptchaError) throw err;
				throw new CaptchaError(captchaErrorCodes.verificationFailed, `altcha-failed: ${err}`);
			}
		}
	}

	@bindThis
	private isUrl(value: string): boolean {
		try {
			const url = new URL(value);
			return url.protocol === 'http:' || url.protocol === 'https:';
		} catch {
			return false;
		}
	}

	@bindThis
	private computeHmac(secret: string, data: string): string {
		return createHmac('sha256', secret).update(data).digest('hex');
	}

	@bindThis
	private computeHash(data: string): string {
		return createHash('sha256').update(data).digest('hex');
	}

	@bindThis
	public async verifyTestcaptcha(response: string | null | undefined): Promise<void> {
		if (response == null) {
			throw new CaptchaError(captchaErrorCodes.noResponseProvided, 'testcaptcha-failed: no response provided');
		}

		const success = response === 'testcaptcha-passed';

		if (!success) {
			throw new CaptchaError(captchaErrorCodes.verificationFailed, 'testcaptcha-failed');
		}
	}

	@bindThis
	public async get(): Promise<CaptchaSetting> {
		const meta = await this.metaService.fetch(true);

		let provider: CaptchaProvider;
		switch (true) {
			case meta.enableHcaptcha: {
				provider = 'hcaptcha';
				break;
			}
			case meta.enableMcaptcha: {
				provider = 'mcaptcha';
				break;
			}
			case meta.enableRecaptcha: {
				provider = 'recaptcha';
				break;
			}
			case meta.enableTurnstile: {
				provider = 'turnstile';
				break;
			}
			case meta.enableAltcha: {
				provider = 'altcha';
				break;
			}
			case meta.enableTestcaptcha: {
				provider = 'testcaptcha';
				break;
			}
			case meta.enableFC: {
				provider = 'fc';
				break;
			}
			default: {
				provider = 'none';
				break;
			}
		}

		return {
			provider: provider,
			hcaptcha: {
				siteKey: meta.hcaptchaSiteKey,
				secretKey: meta.hcaptchaSecretKey,
			},
			mcaptcha: {
				siteKey: meta.mcaptchaSitekey,
				secretKey: meta.mcaptchaSecretKey,
				instanceUrl: meta.mcaptchaInstanceUrl,
			},
			recaptcha: {
				siteKey: meta.recaptchaSiteKey,
				secretKey: meta.recaptchaSecretKey,
			},
			turnstile: {
				siteKey: meta.turnstileSiteKey,
				secretKey: meta.turnstileSecretKey,
			},
			altcha: {
				siteKey: meta.altchaSiteKey,
				secretKey: meta.altchaSecretKey,
				instanceUrl: meta.altchaInstanceUrl,
			},
			fc: {
				siteKey: meta.fcSiteKey,
				secretKey: meta.fcSecretKey,
			},
		};
	}

	/**
	 * captchaの設定を更新します. その際、フロントエンド側で受け取ったcaptchaからの戻り値を検証し、passした場合のみ設定を更新します.
	 * 実際の検証処理はサービス内で定義されている各captchaプロバイダの検証関数に委譲します.
	 *
	 * @param provider 検証するcaptchaのプロバイダ
	 * @param params
	 * @param params.sitekey hcaptcha, recaptcha, turnstile, mcaptchaの場合に指定するsitekey. それ以外のプロバイダでは無視されます
	 * @param params.secret hcaptcha, recaptcha, turnstile, mcaptchaの場合に指定するsecret. それ以外のプロバイダでは無視されます
	 * @param params.instanceUrl mcaptchaの場合に指定するインスタンスのURL. それ以外のプロバイダでは無視されます
	 * @param params.captchaResult フロントエンド側で受け取ったcaptchaプロバイダからの戻り値. この値を使ってサーバサイドでの検証を行います
	 * @see verifyHcaptcha
	 * @see verifyMcaptcha
	 * @see verifyRecaptcha
	 * @see verifyTurnstile
	 * @see verifyTestcaptcha
	 */
	@bindThis
	public async save(
		provider: CaptchaProvider,
		params?: {
			sitekey?: string | null;
			secret?: string | null;
			instanceUrl?: string | null;
			captchaResult?: string | null;
		},
	): Promise<CaptchaSaveResult> {
		if (!supportedCaptchaProviders.includes(provider)) {
			return {
				success: false,
				error: new CaptchaError(captchaErrorCodes.invalidProvider, `Invalid captcha provider: ${provider}`),
			};
		}

		const operation = {
			none: async () => {
				await this.updateMeta(provider, params);
			},
			hcaptcha: async () => {
				if (!params?.secret || !params.captchaResult) {
					throw new CaptchaError(captchaErrorCodes.invalidParameters, 'hcaptcha-failed: secret and captureResult are required');
				}

				await this.verifyHcaptcha(params.secret, params.captchaResult);
				await this.updateMeta(provider, params);
			},
			mcaptcha: async () => {
				if (!params?.secret || !params.sitekey || !params.instanceUrl || !params.captchaResult) {
					throw new CaptchaError(captchaErrorCodes.invalidParameters, 'mcaptcha-failed: secret, sitekey, instanceUrl and captureResult are required');
				}

				await this.verifyMcaptcha(params.secret, params.sitekey, params.instanceUrl, params.captchaResult);
				await this.updateMeta(provider, params);
			},
			recaptcha: async () => {
				if (!params?.secret || !params.captchaResult) {
					throw new CaptchaError(captchaErrorCodes.invalidParameters, 'recaptcha-failed: secret and captureResult are required');
				}

				await this.verifyRecaptcha(params.secret, params.captchaResult);
				await this.updateMeta(provider, params);
			},
			turnstile: async () => {
				if (!params?.secret || !params.captchaResult) {
					throw new CaptchaError(captchaErrorCodes.invalidParameters, 'turnstile-failed: secret and captureResult are required');
				}

				await this.verifyTurnstile(params.secret, params.captchaResult);
				await this.updateMeta(provider, params);
			},
			altcha: async () => {
				if (!params?.secret || !params.captchaResult) {
					throw new CaptchaError(captchaErrorCodes.invalidParameters, 'altcha-failed: secret and captureResult are required');
				}

				// instanceUrl is optional - if not provided, custom server mode is used
				await this.verifyAltcha(params.secret, params.instanceUrl ?? null, params.captchaResult);
				await this.updateMeta(provider, params);
			},
			testcaptcha: async () => {
				if (!params?.captchaResult) {
					throw new CaptchaError(captchaErrorCodes.invalidParameters, 'turnstile-failed: captureResult are required');
				}

				await this.verifyTestcaptcha(params.captchaResult);
				await this.updateMeta(provider, params);
			},
			fc: async () => {
				if (!params?.secret || !params.captchaResult) {
					throw new CaptchaError(captchaErrorCodes.invalidParameters, 'frc-failed: secret and captureResult are required');
				}

				await this.verifyFriendlyCaptcha(params.secret, params.captchaResult);
				await this.updateMeta(provider, params);
			},
		}[provider];

		return operation()
			.then(() => ({ success: true }) as CaptchaSaveSuccess)
			.catch(err => {
				this.logger.info(err);
				const error = err instanceof CaptchaError
					? err
					: new CaptchaError(captchaErrorCodes.unknown, `unknown error: ${err}`, err);
				return {
					success: false,
					error,
				};
			});
	}

	@bindThis
	private async updateMeta(
		provider: CaptchaProvider,
		params?: {
			sitekey?: string | null;
			secret?: string | null;
			instanceUrl?: string | null;
		},
	) {
		const metaPartial: Partial<
			Pick<
				MiMeta,
				('enableHcaptcha' | 'hcaptchaSiteKey' | 'hcaptchaSecretKey') |
				('enableMcaptcha' | 'mcaptchaSitekey' | 'mcaptchaSecretKey' | 'mcaptchaInstanceUrl') |
				('enableRecaptcha' | 'recaptchaSiteKey' | 'recaptchaSecretKey') |
				('enableTurnstile' | 'turnstileSiteKey' | 'turnstileSecretKey') |
				('enableAltcha' | 'altchaSiteKey' | 'altchaSecretKey' | 'altchaInstanceUrl') |
				('enableTestcaptcha' | 'enableFC' | 'fcSiteKey' | 'fcSecretKey')
			>
		> = {
			enableHcaptcha: provider === 'hcaptcha',
			enableMcaptcha: provider === 'mcaptcha',
			enableRecaptcha: provider === 'recaptcha',
			enableTurnstile: provider === 'turnstile',
			enableAltcha: provider === 'altcha',
			enableTestcaptcha: provider === 'testcaptcha',
			enableFC: provider === 'fc',
		};

		const updateIfNotUndefined = <K extends keyof typeof metaPartial>(key: K, value: typeof metaPartial[K]) => {
			if (value !== undefined) {
				metaPartial[key] = value;
			}
		};
		switch (provider) {
			case 'hcaptcha': {
				updateIfNotUndefined('hcaptchaSiteKey', params?.sitekey);
				updateIfNotUndefined('hcaptchaSecretKey', params?.secret);
				break;
			}
			case 'mcaptcha': {
				updateIfNotUndefined('mcaptchaSitekey', params?.sitekey);
				updateIfNotUndefined('mcaptchaSecretKey', params?.secret);
				updateIfNotUndefined('mcaptchaInstanceUrl', params?.instanceUrl);
				break;
			}
			case 'recaptcha': {
				updateIfNotUndefined('recaptchaSiteKey', params?.sitekey);
				updateIfNotUndefined('recaptchaSecretKey', params?.secret);
				break;
			}
			case 'turnstile': {
				updateIfNotUndefined('turnstileSiteKey', params?.sitekey);
				updateIfNotUndefined('turnstileSecretKey', params?.secret);
				break;
			}
			case 'altcha': {
				updateIfNotUndefined('altchaSiteKey', params?.sitekey);
				updateIfNotUndefined('altchaSecretKey', params?.secret);
				updateIfNotUndefined('altchaInstanceUrl', params?.instanceUrl);
				break;
			}
			case 'fc': {
				updateIfNotUndefined('fcSiteKey', params?.sitekey);
				updateIfNotUndefined('fcSecretKey', params?.secret);
			}
		}

		await this.metaService.update(metaPartial);
	}
}

