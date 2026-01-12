/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { AccessTokensRepository, AppsRepository, AuthSessionsRepository } from '@/models/_.js';
import type { Packed } from '@/misc/json-schema.js';
import type { MiApp } from '@/models/App.js';
import type { MiUser } from '@/models/User.js';
import type { Config } from '@/config.js';
import { bindThis } from '@/decorators.js';
import { IdService } from '@/core/IdService.js';

@Injectable()
export class AppEntityService {
	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.appsRepository)
		private appsRepository: AppsRepository,

		@Inject(DI.accessTokensRepository)
		private accessTokensRepository: AccessTokensRepository,

		@Inject(DI.authSessionsRepository)
		private authSessionsRepository: AuthSessionsRepository,

		private idService: IdService,
	) {
	}

	@bindThis
	public async pack(
		src: MiApp['id'] | MiApp,
		me?: { id: MiUser['id'] } | null | undefined,
		options?: {
			detail?: boolean,
			includeSecret?: boolean,
			includeProfileImageIds?: boolean
		},
	): Promise<Packed<'App'>> {
		const opts = Object.assign({
			detail: false,
			includeSecret: false,
			includeProfileImageIds: false,
		}, options);

		const app = typeof src === 'object' ? src : await this.appsRepository.findOneByOrFail({ id: src });

		// Get or create an auth session for this app to generate Mastodon-compatible client_id
		let session = await this.authSessionsRepository.findOneBy({ appId: app.id });
		
		if (!session) {
			// Create a new session token for this app
			const token = randomUUID();
			const sessionId = this.idService.gen();
			try {
				await this.authSessionsRepository.insert({
					id: sessionId,
					appId: app.id,
					token: token,
					userId: null,
				});
				session = await this.authSessionsRepository.findOneBy({ id: sessionId });
			} catch {
				// If insert fails (e.g., duplicate), try to fetch again
				session = await this.authSessionsRepository.findOneBy({ appId: app.id });
			}
		}

		// Generate Mastodon-compatible client_id (base64-encoded authorization session URL)
		// Fallback to app.id if no session exists
		const authUrl = session 
			? `${this.config.authUrl}/${session.token}`
			: `${this.config.authUrl}/${app.id}`;
		const clientId = Buffer.from(authUrl).toString('base64');

		return {
			id: app.id,
			name: app.name,
			callbackUrl: app.callbackUrl,
			permission: app.permission,
			clientId: clientId,
			...(opts.includeSecret ? { secret: app.secret } : {}),
			...(me ? {
				isAuthorized: await this.accessTokensRepository.countBy({
					appId: app.id,
					userId: me.id,
				}).then(count => count > 0),
			} : {}),
		};
	}
}
