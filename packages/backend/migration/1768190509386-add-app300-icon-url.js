/*
 * SPDX-FileCopyrightText: Creaous and other Pulsar contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddApp300IconUrl1768190509386 {
    name = 'AddApp300IconUrl1768190509386'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "app300IconUrl" character varying(1024)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "app300IconUrl"`);
    }
}
