/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { AccessTokensRepository, AppsRepository } from '@/models/_.js';
import type { Packed } from '@/misc/json-schema.js';
import type { MiApp } from '@/models/App.js';
import type { MiUser } from '@/models/User.js';
import { bindThis } from '@/decorators.js';
import type { Config } from '@/config.js';

@Injectable()
export class AppEntityService {
	constructor(
		@Inject(DI.appsRepository)
		private appsRepository: AppsRepository,

		@Inject(DI.accessTokensRepository)
		private accessTokensRepository: AccessTokensRepository,

		@Inject(DI.config)
		private config: Config,
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
	): Promise<Packed<'App'> & { clientId?: string; appUrl?: string }> {
		const opts = Object.assign({
			detail: false,
			includeSecret: false,
			includeProfileImageIds: false,
		}, options);

		const app = typeof src === 'object' ? src : await this.appsRepository.findOneByOrFail({ id: src });

		// Compose canonical app URL for OAuth (same as Mastodon client_id base)
		// Example: `${this.config.url}/auth/${app.id}`
		const appUrl = `${this.config.url.replace(/\/$/, '')}/auth/${app.id}`;
		const clientId = Buffer.from(appUrl).toString('base64');
		return {
			id: app.id,
			name: app.name,
			callbackUrl: app.callbackUrl,
			   // Always normalize permission output to 'read:account' format
			   permission: Array.isArray(app.permission) ? app.permission.map(v => {
				   // If already in 'read:account' or 'write:account' format, leave as is
				   if (/^(read|write):[\w-]+$/.test(v)) return v;
				   // If in 'something/read' or 'something-read', convert
				   const m = v.match(/^([\w-]+)[/-](read|write)$/);
				   if (m) return `${m[2]}:${m[1]}`;
				   return v;
			   }) : app.permission,
			appUrl,
			clientId,
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
