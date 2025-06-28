/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { MiNote, MiUser, NotesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:cw-note',
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		noteId: { type: 'string', format: 'misskey:id' },
		cw: { type: 'string', nullable: true },
	},
	required: ['noteId', 'cw'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.notesRepository)
		private readonly notesRepository: NotesRepository,

		private readonly moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const note = await this.notesRepository.findOneOrFail({
				where: { id: ps.noteId },
				relations: { user: true },
			}) as MiNote & { user: MiUser };

			// Skip if there's nothing to do
			if (note.mandatoryCW === ps.cw) return;

			// Log event first.
			// This ensures that we don't "lose" the log if an error occurs
			await this.moderationLogService.log(me, 'setMandatoryCWForNote', {
				newCW: ps.cw,
				oldCW: note.mandatoryCW,
				noteId: note.id,
				noteUserId: note.user.id,
				noteUserUsername: note.user.username,
				noteUserHost: note.user.host,
			});

			await this.notesRepository.update(ps.noteId, {
				// Collapse empty strings to null
				mandatoryCW: ps.cw || null,
			});
		});
	}
}
