import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountsAndSessions1792214000000
  implements MigrationInterface
{
  name = 'CreateAccountsAndSessions1792214000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "account" ("id" SERIAL NOT NULL, "email" character varying(254) NOT NULL, "password_hash" character varying(128) NOT NULL, CONSTRAINT "UQ_account_email" UNIQUE ("email"), CONSTRAINT "PK_account_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_session" ("id" SERIAL NOT NULL, "account_id" integer NOT NULL, "refresh_token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMPTZ NOT NULL, "revoked_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "UQ_auth_session_refresh_token_hash" UNIQUE ("refresh_token_hash"), CONSTRAINT "PK_auth_session_id" PRIMARY KEY ("id"), CONSTRAINT "FK_auth_session_account" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "auth_session"');
    await queryRunner.query('DROP TABLE "account"');
  }
}
