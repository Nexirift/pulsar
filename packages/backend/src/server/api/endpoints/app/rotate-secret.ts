/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AppsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';
import { AppEntityService } from '@/core/entities/AppEntityService.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['app'],

	requireCredential: true,

	secure: true,

	errors: {
		noSuchApp: {
			message: 'No such app.',
			code: 'NO_SUCH_APP',
			id: 'c4782e38-1e9f-4b7e-8a4d-e8f0c8e8e8ea',
		},
		accessDenied: {
			message: 'Access denied.',
			code: 'ACCESS_DENIED',
			id: 'd4782e38-1e9f-4b7e-8a4d-e8f0c8e8e8eb',
		},
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'App',
	},

	limit: {
		duration: 1000,
		max: 10,
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

		private appEntityService: AppEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const app = await this.appsRepository.findOneBy({
				id: ps.appId,
			});

			if (app == null) {
				throw new ApiError(meta.errors.noSuchApp);
			}

			if (app.userId !== me.id) {
				throw new ApiError(meta.errors.accessDenied);
			}

			// Generate new secret
			const newSecret = secureRndstr(32);

			// Update app with new secret
			await this.appsRepository.update(app.id, {
				secret: newSecret,
			});

			const updatedApp = await this.appsRepository.findOneByOrFail({ id: app.id });

			return await this.appEntityService.pack(updatedApp, me, {
				detail: true,
				includeSecret: true,
			});
		});
	}
}
