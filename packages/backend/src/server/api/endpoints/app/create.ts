/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AppsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { unique } from '@/misc/prelude/array.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';
import { AppEntityService } from '@/core/entities/AppEntityService.js';
import { RoleService } from '@/core/RoleService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['app'],

	requireCredential: false,

	errors: {
		permissionDenied: {
			message: 'You do not have permission to create apps.',
			code: 'PERMISSION_DENIED',
			id: 'b9e3b5a9-3f3e-4e6e-8f9e-0f9e3b5a9e3b',
		},
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'App',
	},

	// 3 calls per second
	limit: {
		duration: 1000,
		max: 3,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		name: { type: 'string' },
		description: { type: 'string' },
		permission: { type: 'array', uniqueItems: true, items: {
			type: 'string',
		} },
		callbackUrl: { type: 'string', nullable: true },
	},
	required: ['name', 'description', 'permission'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.appsRepository)
		private appsRepository: AppsRepository,

		private appEntityService: AppEntityService,
		private idService: IdService,
		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Check app creation policy
			const policies = await this.roleService.getUserPolicies(me ?? null);
			
			if (policies.canCreateApp === 'disabled') {
				throw new ApiError(meta.errors.permissionDenied);
			} else if (policies.canCreateApp === 'loggedIn' && !me) {
				throw new ApiError(meta.errors.permissionDenied);
			}
			// If policy is 'anonymous' or user is authenticated with 'loggedIn', allow

			// Generate secret and client ID
			const secret = secureRndstr(32);

			// for backward compatibility
			const permission = unique(ps.permission.map(v => v.replace(/^(.+)(\/|-)(read|write)$/, '$3:$1')));

			// Assign userId if user is logged in, otherwise leave as null (anonymous app)
			const app = await this.appsRepository.insertOne({
				id: this.idService.gen(),
				userId: me && me.id ? me.id : null,
				name: ps.name,
				description: ps.description,
				permission,
				callbackUrl: ps.callbackUrl,
				secret: secret,
			});

			return await this.appEntityService.pack(app, me, {
				detail: true,
				includeSecret: true,
			});
		});
	}
}
