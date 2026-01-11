/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AppsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { unique } from '@/misc/prelude/array.js';
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
			id: 'c4782e38-1e9f-4b7e-8a4d-e8f0c8e8e8ec',
		},
		accessDenied: {
			message: 'Access denied.',
			code: 'ACCESS_DENIED',
			id: 'd4782e38-1e9f-4b7e-8a4d-e8f0c8e8e8ec',
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
		callbackUrl: { type: 'string', nullable: true },
		permission: { type: 'array', items: { type: 'string' }, nullable: true },
	},
	required: ['appId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.appsRepository)
		private appsRepository: AppsRepository,

		private appEntityService: AppEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Allow update if user owns the app or if it's anonymous (userId is null)
			const app = await this.appsRepository.findOneBy({
				id: ps.appId,
			});

			if (app == null) {
				throw new ApiError(meta.errors.noSuchApp);
			}
			if (app.userId !== null && app.userId !== me.id) {
				throw new ApiError(meta.errors.accessDenied);
			}
			// If app is anonymous and user is logged in, assign ownership
			if (app.userId === null && me.id) {
				app.userId = me.id;
			}

			// Update allowed fields
			if (ps.callbackUrl !== undefined) {
				app.callbackUrl = ps.callbackUrl;
			}
			if (Array.isArray(ps.permission)) {
				// Use the same normalization as app creation
				// for backward compatibility
				app.permission = unique(ps.permission.map(v => v.replace(/^(.+)(\/|-)(read|write)$/, '$3:$1')));
			}

			await this.appsRepository.save(app);

			return await this.appEntityService.pack(app, me, {
				detail: true,
				includeSecret: true,
			});
		});
	}
}
