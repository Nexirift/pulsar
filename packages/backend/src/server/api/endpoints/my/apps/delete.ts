/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AppsRepository } from '@/models/_.js';
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
			id: '3c9f8d9a-2f6e-4b5c-9d7e-1f8d2e3f4g5h',
		},
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
	},
	required: ['appId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.appsRepository)
		private appsRepository: AppsRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const app = await this.appsRepository.findOneBy({
				id: ps.appId,
				userId: me.id,
			});

			if (app == null) {
				throw new ApiError(meta.errors.noSuchApp);
			}

			await this.appsRepository.delete(app.id);
		});
	}
}
