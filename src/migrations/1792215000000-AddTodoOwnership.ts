import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTodoOwnership1792215000000 implements MigrationInterface {
  name = 'AddTodoOwnership1792215000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "todo" ADD "account_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "todo" ADD CONSTRAINT "FK_todo_account" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_todo_account_id_id" ON "todo" ("account_id", "id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_todo_account_id_id"`);
    await queryRunner.query(
      `ALTER TABLE "todo" DROP CONSTRAINT "FK_todo_account"`,
    );
    await queryRunner.query(`ALTER TABLE "todo" DROP COLUMN "account_id"`);
  }
}
