/*
 * SPDX-FileCopyrightText: Creaous and other Pulsar contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NexiriftRepositoryUrl1767696411959 {
  name = 'NexiriftRepositoryUrl1767696411959'

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "repositoryUrl" SET DEFAULT 'https://code.nexirift.com/Nexirift/pulsar'`);
    await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "feedbackUrl" SET DEFAULT 'https://code.nexirift.com/Nexirift/pulsar/issues/new'`);
    await queryRunner.query(`UPDATE "meta" SET "repositoryUrl"=DEFAULT WHERE "repositoryUrl" IN ('https://activitypub.software/TransFem-org/Sharkey/', 'https://git.joinsharkey.org/Sharkey/Sharkey','https://github.com/transfem-org/sharkey','https://github.com/misskey-dev/misskey')`);
    await queryRunner.query(`UPDATE "meta" SET "feedbackUrl"=DEFAULT WHERE "feedbackUrl" IN ('https://activitypub.software/TransFem-org/Sharkey/-/issues/new', 'https://git.joinsharkey.org/Sharkey/Sharkey/issues/new/choose','https://github.com/transfem-org/sharkey/issues/new','https://github.com/misskey-dev/misskey/issues/new')`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "repositoryUrl" SET DEFAULT 'https://activitypub.software/TransFem-org/Sharkey/'`);
    await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "feedbackUrl" SET DEFAULT 'https://activitypub.software/TransFem-org/Sharkey/-/issues/new'`);
    await queryRunner.query(`UPDATE "meta" SET "repositoryUrl"=DEFAULT WHERE "repositoryUrl" IN ('https://git.joinsharkey.org/Sharkey/Sharkey','https://github.com/transfem-org/sharkey','https://github.com/misskey-dev/misskey')`);
    await queryRunner.query(`UPDATE "meta" SET "feedbackUrl"=DEFAULT WHERE "feedbackUrl" IN ('https://git.joinsharkey.org/Sharkey/Sharkey/issues/new/choose','https://github.com/transfem-org/sharkey/issues/new','https://github.com/misskey-dev/misskey/issues/new')`);
  }
}
