/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as assert from "assert";
import { normalize, convertLegacyReactions } from "@/core/ReactionService.js";

describe("ReactionService", () => {
	describe("normalize", () => {
		test("絵文字リアクションはそのまま", async () => {
			assert.strictEqual(normalize("👍"), "👍");
			assert.strictEqual(normalize("🍅"), "🍅");
		});

		test("既存のリアクションは絵文字化する pudding", async () => {
			assert.strictEqual(normalize("pudding"), "🍮");
		});

		test("既存のリアクションは絵文字化する like", async () => {
			assert.strictEqual(normalize("like"), "👍");
		});

		test("既存のリアクションは絵文字化する love", async () => {
			assert.strictEqual(normalize("love"), "❤");
		});

		test("既存のリアクションは絵文字化する laugh", async () => {
			assert.strictEqual(normalize("laugh"), "😆");
		});

		test("既存のリアクションは絵文字化する hmm", async () => {
			assert.strictEqual(normalize("hmm"), "🤔");
		});

		test("既存のリアクションは絵文字化する surprise", async () => {
			assert.strictEqual(normalize("surprise"), "😮");
		});

		test("既存のリアクションは絵文字化する congrats", async () => {
			assert.strictEqual(normalize("congrats"), "🎉");
		});

		test("既存のリアクションは絵文字化する angry", async () => {
			assert.strictEqual(normalize("angry"), "💢");
		});

		test("既存のリアクションは絵文字化する confused", async () => {
			assert.strictEqual(normalize("confused"), "😥");
		});

		test("既存のリアクションは絵文字化する rip", async () => {
			assert.strictEqual(normalize("rip"), "😇");
		});

		test("既存のリアクションは絵文字化する star", async () => {
			assert.strictEqual(normalize("star"), "⭐");
		});

		test("異体字セレクタ除去", async () => {
			assert.strictEqual(normalize("㊗️"), "㊗");
		});

		test("異体字セレクタ除去 必要なし", async () => {
			assert.strictEqual(normalize("㊗"), "㊗");
		});

		test("fallback - null", async () => {
			assert.strictEqual(normalize(null), "❤");
		});

		test("fallback - empty", async () => {
			assert.strictEqual(normalize(""), "❤");
		});

		test("fallback - unknown", async () => {
			assert.strictEqual(normalize("unknown"), "❤");
		});
	});

	describe("convertLegacyReactions", () => {
		test("空の入力に対しては何もしない", () => {
			const input = {};
			assert.deepStrictEqual(convertLegacyReactions(input), input);
		});

		test("Unicode絵文字リアクションを変換してしまわない", () => {
			const input = { "👍": 1, "🍮": 2 };
			assert.deepStrictEqual(convertLegacyReactions(input), input);
		});

		test("カスタム絵文字リアクションを変換してしまわない", () => {
			const input = { ":like@.:": 1, ":pudding@example.tld:": 2 };
			assert.deepStrictEqual(convertLegacyReactions(input), input);
		});

		test("文字列によるレガシーなリアクションを変換する", () => {
			const input = { like: 1, pudding: 2 };
			const output = { "👍": 1, "🍮": 2 };
			assert.deepStrictEqual(convertLegacyReactions(input), output);
		});

		test("host部分が省略されたレガシーなカスタム絵文字リアクションを変換する", () => {
			const input = { ":custom_emoji:": 1 };
			const output = { ":custom_emoji@.:": 1 };
			assert.deepStrictEqual(convertLegacyReactions(input), output);
		});

		test("「0個のリアクション」情報を削除する", () => {
			const input = { angry: 0 };
			const output = {};
			assert.deepStrictEqual(convertLegacyReactions(input), output);
		});

		test("host部分の有無によりデコードすると同じ表記になるカスタム絵文字リアクションの個数情報を正しく足し合わせる", () => {
			const input = { ":custom_emoji:": 1, ":custom_emoji@.:": 2 };
			const output = { ":custom_emoji@.:": 3 };
			assert.deepStrictEqual(convertLegacyReactions(input), output);
		});
	});
});
