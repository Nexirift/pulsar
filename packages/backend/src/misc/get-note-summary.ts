/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { appendContentWarning } from "./append-content-warning.js";
import type { Packed } from "./json-schema.js";

// export type PackedNoteForSummary = Omit<Partial<Packed<'Note'>>, 'user'> & {
// 	user: Omit<Partial<Packed<'Note'>['user']>, 'instance'> & {
// 		instance?: Partial<Packed<'Note'>['user']['instance']> | null;
// 	};
// };

// Workaround for weird typescript but
// type Pivot<N, U, I> = {
// 	[KNote in keyof N]?: KNote extends 'user'
// 		? {
// 			[KUser in keyof U]?: KUser extends 'instance'
// 				? {
// 					[KInst in keyof I]?: I[KInst] | undefined;
// 				}
// 				: U[KUser]
// 		}
// 		: N[KNote]
// };
// type Pivot<N extends { user: U }, U extends { instance?: I | null }, I extends object> = Split<N, 'user'> & {
// 	user: Split<U, 'instance'> & {
// 		instance: I | undefined;
// 	};
// };
//
// type Split<T, O extends keyof T, R extends keyof T = Exclude<keyof T, O>> = {
// 	[K in (keyof T) & R]: T[K];
// } & {
// 	[K in (keyof T) & O]?: T[K] | undefined;
// };
//
// export type PackedNoteForSummary = Pivot<Packed<'Note'>, Packed<'Note'>['user'], NonNullable<Packed<'Note'>['user']['instance']>>;
export type PackedNoteForSummary = DeepPartial<Packed<"Note">>;

// Do we really not have a type for this yet??
type DeepPartial<T extends object> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * 投稿を表す文字列を取得します。
 * @param {*} note (packされた)投稿
 */
export const getNoteSummary = (note: PackedNoteForSummary): string => {
	if (note.deletedAt) {
		return "(❌⛔)";
	}

	if (note.isHidden) {
		return "(⛔)";
	}

	let summary = "";

	// Append mandatory CW, if applicable
	let cw = note.cw;
	if (note.mandatoryCW) {
		cw = appendContentWarning(cw, `Note is flagged: "${note.mandatoryCW}"`);
	}
	if (note.user?.mandatoryCW) {
		const username = note.user.host
			? `@${note.user.username}@${note.user.host}`
			: `@${note.user.username}`;
		cw = appendContentWarning(
			cw,
			`${username} is flagged: "${note.user.mandatoryCW}"`,
		);
	}
	if (note.user?.instance?.mandatoryCW) {
		cw = appendContentWarning(
			cw,
			`${note.user.host} is flagged: "${note.user.instance.mandatoryCW}"`,
		);
	}

	// 本文
	if (cw != null) {
		summary += `CW: ${cw}`;
	} else if (note.text) {
		summary += note.text;
	}

	// ファイルが添付されているとき
	if (note.files && note.files.length !== 0) {
		summary += ` (📎${note.files.length})`;
	}

	// 投票が添付されているとき
	if (note.poll) {
		summary += " (📊)";
	}

	// 返信のとき
	if (note.replyId) {
		if (note.reply && !note.cw) {
			summary += `\n\nRE: ${getNoteSummary(note.reply)}`;
		} else {
			summary += "\n\nRE: ...";
		}
	}

	// Renoteのとき
	if (note.renoteId) {
		if (note.renote && !note.cw) {
			summary += `\n\nRN: ${getNoteSummary(note.renote)}`;
		} else {
			summary += "\n\nRN: ...";
		}
	}

	return summary.trim();
};
