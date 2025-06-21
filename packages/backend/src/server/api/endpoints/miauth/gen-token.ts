/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { SkSharedAccessToken } from '@/models/SkSharedAccessToken.js';
import { ApiError } from '@/server/api/error.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AccessTokensRepository, SharedAccessTokensRepository, UsersRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { NotificationService } from '@/core/NotificationService.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['auth'],

	requireCredential: true,

	secure: true,

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			token: {
				type: 'string',
				optional: false, nullable: false,
			},
		},
	},

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: 'a89abd3d-f0bc-4cce-beb1-2f446f4f1e6a',
		},
	},

	// 10 calls per 5 seconds
	limit: {
		duration: 1000 * 5,
		max: 10,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		session: { type: 'string', nullable: true },
		name: { type: 'string', nullable: true },
		description: { type: 'string', nullable: true },
		iconUrl: { type: 'string', nullable: true },
		permission: { type: 'array', uniqueItems: true, items: {
			type: 'string',
		} },
		grantees: { type: 'array', uniqueItems: true, items: {
			type: 'string',
		} },
		rank: { type: 'string', enum: ['admin', 'mod', 'user'], nullable: true },
	},
	required: ['session', 'permission'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.accessTokensRepository)
		private accessTokensRepository: AccessTokensRepository,

		@Inject(DI.sharedAccessTokensRepository)
		private readonly sharedAccessTokensRepository: SharedAccessTokensRepository,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,

		@Inject(DI.db)
		private readonly db: DataSource,

		private idService: IdService,
		private notificationService: NotificationService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (ps.grantees && ps.grantees.length > 0) {
				const existingCount = await this.usersRepository.countBy({ id: In(ps.grantees) });
				if (existingCount !== ps.grantees.length) {
					throw new ApiError(meta.errors.noSuchUser);
				}
			}

			// Generate access token
			const accessToken = secureRndstr(32);

			const now = new Date();
			const accessTokenId = this.idService.gen(now.getTime());

			await this.db.transaction(async tem => {
				// Insert access token doc
				await this.accessTokensRepository.insert({
					id: accessTokenId,
					lastUsedAt: now,
					session: ps.session,
					userId: me.id,
					token: accessToken,
					hash: accessToken,
					name: ps.name,
					description: ps.description,
					iconUrl: ps.iconUrl,
					permission: ps.permission,
					rank: ps.rank,
				});

				// Insert shared access grants
				if (ps.grantees && ps.grantees.length > 0) {
					const grants = ps.grantees.map(granteeId => new SkSharedAccessToken({ accessTokenId, granteeId }));
					await this.sharedAccessTokensRepository.insert(grants);
				}
			});

			// TODO notify of access granted

			// アクセストークンが生成されたことを通知
			this.notificationService.createNotification(me.id, 'createToken', {});

			return {
				token: accessToken,
			};
		});
	}
}
