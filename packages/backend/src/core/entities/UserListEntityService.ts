/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { MiUserListMembership, UserListMembershipsRepository, UserListsRepository } from '@/models/_.js';
import type { Packed } from '@/misc/json-schema.js';
import type { } from '@/models/Blocking.js';
import type { MiUserList } from '@/models/UserList.js';
import { bindThis } from '@/decorators.js';
import { IdService } from '@/core/IdService.js';
import { CacheService } from '@/core/CacheService.js';
import { UserEntityService } from './UserEntityService.js';

@Injectable()
export class UserListEntityService {
	constructor(
		@Inject(DI.userListsRepository)
		private userListsRepository: UserListsRepository,

		@Inject(DI.userListMembershipsRepository)
		private userListMembershipsRepository: UserListMembershipsRepository,

		private userEntityService: UserEntityService,
		private idService: IdService,
		private readonly cacheService: CacheService,
	) {
	}

	@bindThis
	public async pack(
		src: MiUserList['id'] | MiUserList,
	): Promise<Packed<'UserList'>> {
		const srcId = typeof(src) === 'object' ? src.id : src;

		const [userList, users] = await Promise.all([
			typeof src === 'object' ? src : await this.userListsRepository.findOneByOrFail({ id: src }),
			this.cacheService.listUserMembershipsCache.fetch(srcId),
		]);

		return {
			id: userList.id,
			createdAt: this.idService.parse(userList.id).date.toISOString(),
			name: userList.name,
			userIds: users.keys().toArray(),
			isPublic: userList.isPublic,
		};
	}

	@bindThis
	public async packMembershipsMany(
		memberships: MiUserListMembership[],
	) {
		const _users = memberships.map(({ user, userId }) => user ?? userId);
		const _userMap = await this.userEntityService.packMany(_users)
			.then(users => new Map(users.map(u => [u.id, u])));
		return Promise.all(memberships.map(async x => ({
			id: x.id,
			createdAt: this.idService.parse(x.id).date.toISOString(),
			userId: x.userId,
			user: _userMap.get(x.userId) ?? await this.userEntityService.pack(x.userId),
			withReplies: x.withReplies,
		})));
	}
}

