export class AddDisableInactivityToMeta1767009171380 {
    name = 'AddDisableInactivityToMeta1767009171380'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "disableInactivity" boolean NOT NULL DEFAULT false`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "disableInactivity"`);
    }
}
