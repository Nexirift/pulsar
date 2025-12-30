export class AddUserIsEighteenPlus1767084418000 {
	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "isEighteenPlus" boolean NOT NULL DEFAULT false`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isEighteenPlus"`);
	}
};
