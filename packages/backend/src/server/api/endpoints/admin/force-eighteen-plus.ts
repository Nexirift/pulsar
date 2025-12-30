/*
 * SPDX-FileCopyrightText: marie and other Sharkey contributors
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
    kind: 'write:admin:force-eighteen-plus',
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
        @Inject(DI.usersRepository)
        private readonly usersRepository: UsersRepository,
        private readonly moderationLogService: ModerationLogService,
        private readonly cacheService: CacheService,
    ) {
        super(meta, paramDef, async (ps, me) => {
            const user = await this.cacheService.findUserById(ps.userId);
            if (user.isEighteenPlusForced) return;

            await this.usersRepository.update(user.id, {
                isEighteenPlusForced: true,
            });

            await this.cacheService.userByIdCache.delete(ps.userId);

            await this.moderationLogService.log(me, 'forceEighteenPlus', {
                userId: ps.userId,
                userUsername: user.username,
                userHost: user.host,
            });
        });
    }
}
