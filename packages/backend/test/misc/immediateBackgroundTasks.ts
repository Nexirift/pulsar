/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { IObject } from '@/core/activitypub/type.js';
import { ApPersonService } from '@/core/activitypub/models/ApPersonService.js';
import { MiRemoteUser, MiUser } from '@/models/User.js';
import { FetchInstanceMetadataService } from '@/core/FetchInstanceMetadataService.js';
import { MiInstance } from '@/models/Instance.js';
import { Resolver } from '@/core/activitypub/ApResolverService.js';
import { bindThis } from '@/decorators.js';

export class ImmediateApPersonService extends ApPersonService {
	@bindThis
	async createPerson(uri: string, resolver?: Resolver): Promise<MiRemoteUser> {
		const user = await super.createPerson(uri, resolver);
		await this.updateFeatured(user, resolver);
		return user;
	}

	@bindThis
	async updatePerson(uri: string, resolver?: Resolver | null, hint?: IObject, movePreventUris: string[] = []): Promise<string | void> {
		const result = await super.updatePerson(uri, resolver, hint, movePreventUris);

		const user = await this.fetchPerson(uri);
		if (user == null) throw new Error('updated user is null, did you forget to mock out caches?');
		await this.updateFeatured(user, resolver ?? undefined);

		return result;
	}

	@bindThis
	async updatePersonLazy(uriOrUser: string | MiUser): Promise<void> {
		const userId = typeof(uriOrUser) === 'object' ? uriOrUser.id : uriOrUser;
		await this.updatePerson(userId);
	}

	@bindThis
	async updateFeaturedLazy(userOrId: string | MiUser): Promise<void> {
		await this.updateFeatured(userOrId);
	}
}

export class ImmediateFetchInstanceMetadataService extends FetchInstanceMetadataService {
	@bindThis
	async fetchInstanceMetadataLazy(instance: MiInstance): Promise<void> {
		return await this.fetchInstanceMetadata(instance);
	}
}
