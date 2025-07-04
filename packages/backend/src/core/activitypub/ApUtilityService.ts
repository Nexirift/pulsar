/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { UtilityService } from '@/core/UtilityService.js';
import { IdentifiableError } from '@/misc/identifiable-error.js';
import { toArray } from '@/misc/prelude/array.js';
import { getApId, getOneApHrefNullable, IObject } from '@/core/activitypub/type.js';

@Injectable()
export class ApUtilityService {
	constructor(
		private readonly utilityService: UtilityService,
	) {}

	/**
	 * Verifies that the object's ID has the same authority as the provided URL.
	 * Returns on success, throws on any validation error.
	 */
	public assertIdMatchesUrlAuthority(object: IObject, url: string): void {
		// This throws if the ID is missing or invalid, but that's ok.
		// Anonymous objects are impossible to verify, so we don't allow fetching them.
		const id = getApId(object, url);

		// Make sure the object ID matches the final URL (which is where it actually exists).
		// The caller (ApResolverService) will verify the ID against the original / entry URL, which ensures that all three match.
		if (!this.haveSameAuthority(url, id)) {
			throw new IdentifiableError('fd93c2fa-69a8-440f-880b-bf178e0ec877', `invalid AP object ${url}: id ${id} has different host authority`);
		}
	}

	/**
	 * Checks if two URLs have the same host authority
	 */
	public haveSameAuthority(url1: string, url2: string): boolean {
		if (url1 === url2) return true;

		const parsed1 = this.utilityService.assertUrl(url1);
		const parsed2 = this.utilityService.assertUrl(url2);

		const authority1 = this.utilityService.punyHostPSLDomain(parsed1);
		const authority2 = this.utilityService.punyHostPSLDomain(parsed2);
		return authority1 === authority2;
	}

	/**
	 * Finds the "best" URL for a given AP object.
	 * The list of URLs is first filtered via findSameAuthorityUrl, then further filtered based on mediaType, and finally sorted to select the best one.
	 * @throws {IdentifiableError} if object does not have an ID
	 * @returns the best URL, or null if none were found
	 */
	public findBestObjectUrl(object: IObject): string | null {
		const targetUrl = getApId(object);
		const targetAuthority = this.utilityService.punyHostPSLDomain(targetUrl);

		const rawUrls = toArray(object.url);
		const acceptableUrls = rawUrls
			.map(raw => ({
				url: getOneApHrefNullable(raw),
				type: typeof(raw) === 'object'
					? raw.mediaType?.toLowerCase()
					: undefined,
			}))
			.filter(({ url, type }) => {
				try {
					if (!url) return false;
					if (!isAcceptableUrlType(type)) return false;
					const parsed = this.utilityService.assertUrl(url);

					const urlAuthority = this.utilityService.punyHostPSLDomain(parsed);
					return urlAuthority === targetAuthority;
				} catch {
					return false;
				}
			})
			.sort((a, b) => {
				return rankUrlType(a.type) - rankUrlType(b.type);
			});

		return acceptableUrls[0]?.url ?? null;
	}
}

function isAcceptableUrlType(type: string | undefined): boolean {
	if (!type) return true;
	if (type.startsWith('text/')) return true;
	if (type.startsWith('application/ld+json')) return true;
	if (type.startsWith('application/activity+json')) return true;
	return false;
}

function rankUrlType(type: string | undefined): number {
	if (!type) return 2;
	if (type === 'text/html') return 0;
	if (type.startsWith('text/')) return 1;
	if (type.startsWith('application/ld+json')) return 3;
	if (type.startsWith('application/activity+json')) return 4;
	return 5;
}
