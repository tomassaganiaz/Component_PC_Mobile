import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLaptopCategory1720000000002 implements MigrationInterface {
  name = 'AddLaptopCategory1720000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agrega el valor 'laptop' al enum de categorías sin depender del nombre
    // exacto del tipo (puede variar entre migraciones y synchronize).
    await queryRunner.query(`
      DO $$
      DECLARE et text;
      BEGIN
        SELECT t.typname INTO et
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typtype = 'e' AND e.enumlabel = 'tablet'
        LIMIT 1;
        IF et IS NOT NULL THEN
          EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''laptop''', et);
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // Postgres no permite eliminar valores de un enum fácilmente.
  }
}
