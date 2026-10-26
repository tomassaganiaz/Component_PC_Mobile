import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationTypes1720000000004 implements MigrationInterface {
  name = "AddNotificationTypes1720000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agrega los nuevos tipos de notificación sin depender del nombre exacto
    // del tipo (puede variar entre migrate/synchronize). Si la columna es
    // VARCHAR (esquema SQL legacy), no hace nada.
    await queryRunner.query(`
      DO $$
      DECLARE et text;
      BEGIN
        SELECT t.typname INTO et
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typtype = 'e' AND e.enumlabel = 'order_shipped'
        LIMIT 1;
        IF et IS NOT NULL THEN
          EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''order_stage''', et);
          EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''new_product''', et);
          EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''price_drop''', et);
          EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''back_in_stock''', et);
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // Postgres no permite eliminar valores de un enum fácilmente.
  }
}
