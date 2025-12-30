export class AddUserAdultsOnlyForced1767089999999 {
	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "isAdultsOnlyForced" boolean NOT NULL DEFAULT false`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isAdultsOnlyForced"`);
	}
};
