/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import nodePath from 'node:path';
import nodeFs from 'node:fs';
import { Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import { type ManagedMemoryKVCache, CacheManagementService } from '@/global/CacheManagementService.js';

/**
 * Provides structured, mockable access to runtime/environment details.
 */
@Injectable()
export class EnvService {
	protected readonly dependencyVersionCache: ManagedMemoryKVCache<string | null>;

	constructor(cacheManagementService: CacheManagementService) {
		this.dependencyVersionCache = cacheManagementService.createMemoryKVCache<string | null>(Infinity);
	}

	/**
	 * Returns the environment variables of the process.
	 * Can be modified, but modifications are not reflected to the operating system environment.
	 */
	public get env(): Partial<Record<string, string>> {
		return process.env;
	}

	/**
	 * Returns the installed version of a given dependency, or null if not installed.
	 */
	@bindThis
	public async getDependencyVersion(dependency: string): Promise<string | null> {
		return await this.dependencyVersionCache.fetch(dependency, async () => {
			const packageJsonPath = nodePath.join(import.meta.dirname, '../../package.json');
			const packageJsonText = nodeFs.readFileSync(packageJsonPath, 'utf8');

			// No "dependencies" section -> infer not installed.
			const packageJson = JSON.parse(packageJsonText) as { dependencies?: Partial<Record<string, string>> };
			if (packageJson.dependencies == null) return null;

			// Not listed -> not installed.
			const version = packageJson.dependencies['mfm-js'];
			if (version == null) return null;

			// Just in case some other value is there
			return String(version);
		});
	}
}
