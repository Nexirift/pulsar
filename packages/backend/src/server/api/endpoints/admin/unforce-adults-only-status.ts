/*
 * SPDX-FileCopyrightText: Creaous and other Pulsar contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { UsersRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { CacheService } from '@/core/CacheService.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';

export const meta = {
    tags: ['admin'],
    requireCredential: true,
    requireModerator: true,
    kind: 'write:admin:unforce-adults-only-status',
    secure: true,
} as const;

export const paramDef = {
    type: 'object',
    properties: {
        userId: { type: 'string', format: 'misskey:id' },
    },
    required: ['userId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
    constructor(
        private readonly cacheService: CacheService,
        private readonly moderationLogService: ModerationLogService,
        @Inject(DI.usersRepository)
        private readonly usersRepository: UsersRepository,
    ) {
        super(meta, paramDef, async (ps, me) => {
            const user = await this.cacheService.findUserById(ps.userId);
            if (!user.isAdultsOnlyForced) return;

            await this.usersRepository.update(user.id, {
                isAdultsOnlyForced: false,
            });

            await this.cacheService.userByIdCache.delete(ps.userId);

            await this.moderationLogService.log(me, 'unforceAdultsOnly', {
                userId: ps.userId,
                userUsername: user.username,
                userHost: user.host,
            });
        });
    }
}
