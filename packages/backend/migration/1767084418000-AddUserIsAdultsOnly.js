export class AddUserisAdultsOnly1767084418000 {
	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "isAdultsOnly" boolean NOT NULL DEFAULT false`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isAdultsOnly"`);
	}
};
