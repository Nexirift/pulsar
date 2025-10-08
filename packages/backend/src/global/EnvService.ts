/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import nodePath from 'node:path';
import nodeFs from 'node:fs';
import { Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import { type ManagedMemoryKVCache, CacheManagementService } from '@/global/CacheManagementService.js';
import { type EnvOption, createEnvOptions } from '@/env.js';

/**
 * Provides structured, mockable access to runtime/environment details.
 */
@Injectable()
export class EnvService {
	protected readonly dependencyVersionCache: ManagedMemoryKVCache<string | null>;
	protected readonly envOptions: EnvOption;

	constructor(cacheManagementService: CacheManagementService) {
		this.dependencyVersionCache = cacheManagementService.createMemoryKVCache<string | null>(Infinity);
		this.envOptions = createEnvOptions(() => this.env);
	}

	/**
	 * Returns the environment variables of the process.
	 * Modifications are reflected back to the local process, but not to the operating system environment.
	 */
	public get env(): Partial<Record<string, string>> {
		return process.env;
	}

	/**
	 * Maps and returns environment-based options for the process.
	 * Modifications are reflected back to the local process ("env" property), but not to the operating system environment.
	 */
	public get options(): EnvOption {
		return this.envOptions;
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
