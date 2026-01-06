/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import ms from 'ms';
import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { MetaService } from '@/core/MetaService.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['tenor'],

	requireCredential: false,

	limit: {
		duration: ms('1minute'),
		max: 30,
	},

	errors: {
		noApiKey: {
			message: 'Tenor API key is not configured.',
			code: 'TENOR_API_KEY_NOT_CONFIGURED',
			id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
		},
		requestFailed: {
			message: 'Failed to fetch from Tenor API.',
			code: 'TENOR_REQUEST_FAILED',
			id: 'd4e5f6a7-b890-1234-def1-234567890123',
		},
	},

	res: {
		type: 'object',
		properties: {
			results: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						url: { type: 'string' },
						preview: { type: 'string' },
						title: { type: 'string' },
					},
				},
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 50, default: 30 },
		pos: { type: 'string', nullable: true },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private httpRequestService: HttpRequestService,
		private metaService: MetaService,
	) {
		super(meta, paramDef, async (ps) => {
			const instance = await this.metaService.fetch();
			
			if (!instance.tenorApiKey) {
				throw new ApiError(meta.errors.noApiKey);
			}

			try {
				const url = new URL('https://tenor.googleapis.com/v2/featured');
				url.searchParams.set('key', instance.tenorApiKey);
				url.searchParams.set('client_key', 'pulsar');
				url.searchParams.set('limit', ps.limit.toString());
				url.searchParams.set('media_filter', 'gif,tinygif');
				if (ps.pos) {
					url.searchParams.set('pos', ps.pos);
				}

				const response = await this.httpRequestService.getJson<{
					results?: Array<{
						id: string;
						content_description?: string;
						media_formats: {
							gif?: { url: string };
							tinygif?: { url: string };
						};
					}>;
					next?: string;
				}>(url.toString());

				const results = response.results?.map(item => ({
					id: item.id,
					url: item.media_formats.gif?.url || item.media_formats.tinygif?.url || '',
					preview: item.media_formats.tinygif?.url || item.media_formats.gif?.url || '',
					title: item.content_description || '',
				})) || [];

				return { results, next: response.next || null };
			} catch (error) {
				throw new ApiError(meta.errors.requestFailed);
			}
		});
	}
}
