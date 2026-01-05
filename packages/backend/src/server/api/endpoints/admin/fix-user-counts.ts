/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { UsersRepository, NotesRepository, FollowingsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { InternalEventService } from '@/global/InternalEventService.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:account',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			fixed: {
				type: 'number',
				optional: false, nullable: false,
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		userId: {
			type: 'string',
			format: 'misskey:id',
			description: 'User ID to fix counts for. If not provided, fixes all local users.',
		},
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.followingsRepository)
		private followingsRepository: FollowingsRepository,

		private globalEventService: GlobalEventService,
		private userEntityService: UserEntityService,
		private internalEventService: InternalEventService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Fix specific user or all local users
			const users = ps.userId
				? [await this.usersRepository.findOneByOrFail({ id: ps.userId })]
				: await this.usersRepository.findBy({ host: IsNull() }); // All local users

			let fixed = 0;

			for (const user of users) {
				// Count actual notes
				const notesCount = await this.notesRepository.countBy({
					userId: user.id,
				});

				// Count actual followings
				const followingCount = await this.followingsRepository.countBy({
					followerId: user.id,
				});

				// Count actual followers
				const followersCount = await this.followingsRepository.countBy({
					followeeId: user.id,
				});

				console.log(`[fix-user-counts] User ${user.id}: notesCount=${notesCount}, followingCount=${followingCount}, followersCount=${followersCount}`);

				// Update user with correct counts
				await this.usersRepository.update({ id: user.id }, {
					notesCount,
					followingCount,
					followersCount,
				});

				// Broadcast user update to all clients
				const packed = await this.userEntityService.pack(user.id, { id: user.id }, { schema: 'MeDetailed' });
				this.globalEventService.publishMainStream(user.id, 'meUpdated', packed);
				
				// Also emit internal event so caches and other services are updated
				this.internalEventService.emit('userUpdated', { id: user.id });

				fixed++;
			}

			return { fixed };
		});
	}
}
