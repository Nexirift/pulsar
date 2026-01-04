/*
 * SPDX-FileCopyrightText: Creaous and Pulsar contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddAltcha1767520213766 {
	name = 'AddAltcha1767520213766'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD "enableAltcha" boolean NOT NULL DEFAULT false`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "altchaSiteKey" character varying(1024)`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "altchaSecretKey" character varying(1024)`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "altchaInstanceUrl" character varying(1024)`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "altchaInstanceUrl"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "altchaSecretKey"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "altchaSiteKey"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "enableAltcha"`);
	}
}
