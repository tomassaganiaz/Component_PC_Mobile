import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderFulfillmentStage1720000000003 implements MigrationInterface {
  name = "AddOrderFulfillmentStage1720000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "fulfillment_stage" varchar(32) NOT NULL DEFAULT 'awaiting_payment'
    `);
    await queryRunner.query(`
      UPDATE "orders"
      SET "fulfillment_stage" = CASE
        WHEN "status" IN ('paid', 'in_custody') THEN 'center_reception'
        WHEN "status" IN ('shipped', 'delivered') THEN 'dispatch'
        ELSE 'awaiting_payment'
      END
      WHERE "fulfillment_stage" = 'awaiting_payment'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "fulfillment_stage"`,
    );
  }
}
