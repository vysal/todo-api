import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProfile1792213000000 implements MigrationInterface {
  name = 'CreateProfile1792213000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "profile" ("id" integer NOT NULL, "username" character varying(50) NOT NULL DEFAULT '', "displayName" character varying(100) NOT NULL DEFAULT '', "email" character varying(254) NOT NULL DEFAULT '', CONSTRAINT "PK_profile_id" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "profile"');
  }
}