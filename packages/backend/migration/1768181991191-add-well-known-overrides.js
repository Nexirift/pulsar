/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddWellKnownOverrides1768181991191 {
    name = 'AddWellKnownOverrides1768181991191'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "appleAppSiteAssociation" character varying(8192) NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "meta" ADD "androidAssetLinks" character varying(8192) NOT NULL DEFAULT '[]'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "androidAssetLinks"`);
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "appleAppSiteAssociation"`);
    }
}
