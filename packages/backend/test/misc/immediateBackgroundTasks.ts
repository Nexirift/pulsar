/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ApPersonService } from '@/core/activitypub/models/ApPersonService.js';
import { MiUser } from '@/models/User.js';
import { FetchInstanceMetadataService } from '@/core/FetchInstanceMetadataService.js';
import { MiInstance } from '@/models/Instance.js';
import { Resolver } from '@/core/activitypub/ApResolverService.js';
import { bindThis } from '@/decorators.js';

export class ImmediateApPersonService extends ApPersonService {
	public resolver?: Resolver;

	@bindThis
	async updatePersonLazy(uriOrUser: string | MiUser): Promise<void> {
		const userId = typeof(uriOrUser) === 'object' ? uriOrUser.id : uriOrUser;
		await this.updatePerson(userId, this.resolver);
	}

	@bindThis
	async updateFeaturedLazy(userOrId: string | MiUser): Promise<void> {
		await this.updateFeatured(userOrId, this.resolver);
	}
}

export class ImmediateFetchInstanceMetadataService extends FetchInstanceMetadataService {
	@bindThis
	async fetchInstanceMetadataLazy(instance: MiInstance): Promise<void> {
		return await this.fetchInstanceMetadata(instance);
	}
}
