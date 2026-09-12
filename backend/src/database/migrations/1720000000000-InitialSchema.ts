import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1720000000000 implements MigrationInterface {
  name = 'InitialSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extension UUID
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Enums
    await queryRunner.query(`
      CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
    `);
    await queryRunner.query(`
      CREATE TYPE product_condition AS ENUM ('new', 'used');
    `);
    await queryRunner.query(`
      CREATE TYPE product_category AS ENUM (
        'cpu', 'gpu', 'ram', 'storage', 'motherboard', 'psu', 
        'case', 'cooling', 'monitor', 'keyboard', 'mouse', 
        'phone', 'tablet', 'other'
      );
    `);
    await queryRunner.query(`
      CREATE TYPE product_status AS ENUM ('draft', 'pending', 'verified', 'published', 'sold');
    `);
    await queryRunner.query(`
      CREATE TYPE order_status AS ENUM ('pending', 'paid', 'in_custody', 'shipped', 'delivered', 'cancelled', 'refunded');
    `);
    await queryRunner.query(`
      CREATE TYPE verification_result AS ENUM ('pass', 'fail', 'conditional');
    `);
    await queryRunner.query(`
      CREATE TYPE review_type AS ENUM ('positive', 'neutral', 'complaint');
    `);
    await queryRunner.query(`
      CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'resolved');
    `);

    // Tabla users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "name" VARCHAR(100) NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "phone" VARCHAR(20),
        "avatar" VARCHAR(500),
        "role" user_role NOT NULL DEFAULT 'buyer',
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "idx_users_role" ON "users" ("role")`);
    await queryRunner.query(`CREATE INDEX "idx_users_deleted_at" ON "users" ("deleted_at")`);

    // Tabla products
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "title" VARCHAR(200) NOT NULL,
        "description" TEXT NOT NULL,
        "price" DECIMAL(10,2) NOT NULL,
        "condition" product_condition NOT NULL,
        "category" product_category NOT NULL,
        "status" product_status NOT NULL DEFAULT 'draft',
        "images" TEXT,
        "hours_of_use" INTEGER,
        "physical_state" VARCHAR(500),
        "brand" VARCHAR(100),
        "model" VARCHAR(200),
        "average_rating" DECIMAL(3,2),
        "review_count" INTEGER NOT NULL DEFAULT 0,
        "seller_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_products_price" CHECK ("price" >= 0),
        CONSTRAINT "FK_products_seller_id" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_products_status_category" ON "products" ("status", "category")`);
    await queryRunner.query(`CREATE INDEX "idx_products_seller_status" ON "products" ("seller_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_products_condition_status" ON "products" ("condition", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_products_price" ON "products" ("price")`);

    // Tabla orders
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "total" DECIMAL(10,2) NOT NULL,
        "status" order_status NOT NULL DEFAULT 'pending',
        "shipping_address" VARCHAR(500),
        "payment_method" VARCHAR(50),
        "custody_start_date" TIMESTAMPTZ,
        "custody_end_date" TIMESTAMPTZ,
        "cancellation_reason" TEXT,
        "buyer_id" UUID NOT NULL,
        "product_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_orders_total" CHECK ("total" >= 0),
        CONSTRAINT "FK_orders_buyer_id" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_orders_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_orders_buyer_status" ON "orders" ("buyer_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_orders_status_created" ON "orders" ("status", "created_at")`);

    // Tabla verifications
    await queryRunner.query(`
      CREATE TABLE "verifications" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "result" verification_result NOT NULL,
        "notes" TEXT NOT NULL,
        "hours_of_use" INTEGER,
        "physical_state" VARCHAR(500),
        "functional_test" VARCHAR(500),
        "cosmetic_grade" VARCHAR(10),
        "quality_score" DECIMAL(3,2),
        "product_id" UUID NOT NULL,
        "verified_by" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_verifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_verifications_quality_score" CHECK ("quality_score" >= 0 AND "quality_score" <= 5),
        CONSTRAINT "FK_verifications_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_verifications_verified_by" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_verifications_product_result" ON "verifications" ("product_id", "result")`);
    await queryRunner.query(`CREATE INDEX "idx_verifications_verified_by" ON "verifications" ("verified_by")`);

    // Tabla reviews
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "rating" SMALLINT NOT NULL,
        "type" review_type NOT NULL,
        "status" review_status NOT NULL DEFAULT 'pending',
        "comment" TEXT,
        "seller_rating" SMALLINT,
        "product_rating" SMALLINT,
        "complaint_reason" TEXT,
        "resolution_notes" TEXT,
        "is_verified_purchase" BOOLEAN NOT NULL DEFAULT false,
        "buyer_id" UUID NOT NULL,
        "seller_id" UUID NOT NULL,
        "product_id" UUID NOT NULL,
        "order_id" UUID,
        "resolved_by" UUID,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_reviews_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_reviews_rating" CHECK ("rating" >= 1 AND "rating" <= 5),
        CONSTRAINT "CK_reviews_seller_rating" CHECK ("seller_rating" IS NULL OR ("seller_rating" >= 1 AND "seller_rating" <= 5)),
        CONSTRAINT "CK_reviews_product_rating" CHECK ("product_rating" IS NULL OR ("product_rating" >= 1 AND "product_rating" <= 5)),
        CONSTRAINT "FK_reviews_buyer_id" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_reviews_seller_id" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_reviews_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_reviews_order_id" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_reviews_buyer_product" UNIQUE ("buyer_id", "product_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_reviews_seller_status" ON "reviews" ("seller_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_reviews_product_status" ON "reviews" ("product_id", "status")`);

    // Trigger para updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updated_at" = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    await queryRunner.query(`
      CREATE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    await queryRunner.query(`
      CREATE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "products" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    await queryRunner.query(`
      CREATE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "orders" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    await queryRunner.query(`
      CREATE TRIGGER "update_reviews_updated_at" BEFORE UPDATE ON "reviews" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "update_reviews_updated_at" ON "reviews"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS "update_orders_updated_at" ON "orders"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS "update_products_updated_at" ON "products"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS "update_users_updated_at" ON "users"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "verifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS review_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS review_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS verification_result`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS product_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS product_category`);
    await queryRunner.query(`DROP TYPE IF EXISTS product_condition`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
