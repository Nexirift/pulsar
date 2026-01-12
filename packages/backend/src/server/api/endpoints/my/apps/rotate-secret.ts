/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AppsRepository, AccessTokensRepository } from '@/models/_.js';
import { AppEntityService } from '@/core/entities/AppEntityService.js';
import { DI } from '@/di-symbols.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['account', 'app'],

	requireCredential: true,
	kind: 'write:account',

	secure: true,

	errors: {
		noSuchApp: {
			message: 'No such app.',
			code: 'NO_SUCH_APP',
			id: '4d8e9f0a-3g7f-5c6d-ae8f-2g9e3f4g5h6i',
		},
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'App',
	},

	// 3 calls per minute
	limit: {
		duration: 1000 * 60,
		max: 3,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		appId: { type: 'string', format: 'misskey:id' },
	},
	required: ['appId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.appsRepository)
		private appsRepository: AppsRepository,

		@Inject(DI.accessTokensRepository)
		private accessTokensRepository: AccessTokensRepository,

		private appEntityService: AppEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const app = await this.appsRepository.findOneBy({
				id: ps.appId,
				userId: me.id,
			});

			if (app == null) {
				throw new ApiError(meta.errors.noSuchApp);
			}

			// Generate new secret
			const newSecret = secureRndstr(32);

			// Update app with new secret
			await this.appsRepository.update(app.id, {
				secret: newSecret,
			});

			// Invalidate all existing access tokens for this app
			// This ensures that the old secret can no longer be used
			await this.accessTokensRepository.delete({
				appId: app.id,
			});

			const updatedApp = await this.appsRepository.findOneByOrFail({ id: app.id });

			return await this.appEntityService.pack(updatedApp, me, {
				detail: true,
				includeSecret: true,
			});
		});
	}
}
