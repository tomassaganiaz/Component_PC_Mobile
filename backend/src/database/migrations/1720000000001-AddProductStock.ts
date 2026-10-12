import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductStock1720000000001 implements MigrationInterface {
  name = "AddProductStock1720000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stock" INTEGER NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "stock"`,
    );
  }
}
