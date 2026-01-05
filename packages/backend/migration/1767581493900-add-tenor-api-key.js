/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddTenorApiKey1767581493900 {
	name = 'AddTenorApiKey1767581493900'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD "enableTenor" boolean NOT NULL DEFAULT false`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "tenorApiKey" character varying(1024)`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "tenorApiKey"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "enableTenor"`);
	}
}
