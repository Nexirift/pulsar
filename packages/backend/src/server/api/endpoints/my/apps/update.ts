/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AppsRepository } from '@/models/_.js';
import { unique } from '@/misc/prelude/array.js';
import { AppEntityService } from '@/core/entities/AppEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['account', 'app'],

	requireCredential: true,
	kind: 'write:account',

	errors: {
		noSuchApp: {
			message: 'No such app.',
			code: 'NO_SUCH_APP',
			id: '2b5d3b8b-1f88-4e5b-9c7e-1e8c1e2e3e4e',
		},
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'App',
	},

	// 5 calls per second
	limit: {
		duration: 1000,
		max: 5,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		appId: { type: 'string', format: 'misskey:id' },
		name: { type: 'string', minLength: 1, maxLength: 128 },
		description: { type: 'string', minLength: 0, maxLength: 512 },
		permission: { type: 'array', uniqueItems: true, items: {
			type: 'string',
		} },
		callbackUrl: { type: 'string', nullable: true, maxLength: 512 },
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
				userId: me.id,
			});

			if (app == null) {
				throw new ApiError(meta.errors.noSuchApp);
			}

			const updateData: Partial<{
				name: string;
				description: string;
				permission: string[];
				callbackUrl: string | null;
			}> = {};

			if (ps.name !== undefined) {
				updateData.name = ps.name;
			}

			if (ps.description !== undefined) {
				updateData.description = ps.description;
			}

			if (ps.permission !== undefined) {
				// for backward compatibility
				updateData.permission = unique(ps.permission.map(v => v.replace(/^(.+)(\/|-)(read|write)$/, '$3:$1')));
			}

			if (ps.callbackUrl !== undefined) {
				updateData.callbackUrl = ps.callbackUrl;
			}

			if (Object.keys(updateData).length > 0) {
				await this.appsRepository.update(app.id, updateData);
			}

			const updatedApp = await this.appsRepository.findOneByOrFail({ id: app.id });

			return await this.appEntityService.pack(updatedApp, me, {
				detail: true,
				includeSecret: true,
			});
		});
	}
}
