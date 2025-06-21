/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { SharedAccessTokensRepository } from '@/models/_.js';
import { ApiError } from '@/server/api/error.js';

export const meta = {
	requireCredential: true,
	secure: true,

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			userId: {
				type: 'string',
				optional: false, nullable: false,
			},
			token: {
				type: 'string',
				optional: false, nullable: false,
			},
		},
	},

	errors: {
		noSuchAccess: {
			message: 'No such access',
			code: 'NO_SUCH_ACCESS',
			id: 'd536e0f2-47fc-4d66-843c-f9276e98030f',
			httpStatusCode: 403,
		},
	},

	// 2 calls per second
	limit: {
		duration: 1000,
		max: 2,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		grantId: { type: 'string' },
	},
	required: ['grantId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.sharedAccessToken)
		private readonly sharedAccessTokensRepository: SharedAccessTokensRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			const token = await this.sharedAccessTokensRepository.findOne({
				where: { accessTokenId: ps.grantId, granteeId: me.id },
				relations: { accessToken: true },
			});

			if (!token) {
				throw new ApiError(meta.errors.noSuchAccess);
			}

			return {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				token: token.accessToken!.token,

				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				userId: token.accessToken!.userId,
			};
		});
	}
}
