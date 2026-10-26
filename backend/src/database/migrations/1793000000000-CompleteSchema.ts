import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Esquema COMPLETO para despliegues nuevos (producción, synchronize:false).
 *
 * InitialSchema crea las 5 tablas base pero con columnas desactualizadas y sin
 * las tablas secundarias — que en desarrollo "existían" solo gracias a
 * synchronize. Esta migración:
 *   1. completa las columnas faltantes de users/products/orders;
 *   2. alinea orders.product_id con la entidad (nullable: createFromCart);
 *   3. crea todas las tablas secundarias que faltaban.
 * Las tablas base no se recrean (ya las creó InitialSchema) y las columnas
 * `stock` y `fulfillment_stage` las agregan sus propias migraciones.
 */
export class CompleteSchema1793000000000 implements MigrationInterface {
  name = "CompleteSchema1793000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ------------------------------------------------------------------
    // 1) Columnas faltantes en las tablas base de InitialSchema
    // ------------------------------------------------------------------
    // users: sesión, KYC y OTP
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "push_token" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "accepts_testing" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "document_verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otp_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otp_code" character varying(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otp_expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lat" numeric(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lng" numeric(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "province" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "postal_code" character varying(20)`,
    );

    // products: flags de catálogo, auditoría y ubicación (stock lo pone AddProductStock)
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "reported_hours_of_use" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "usage_type" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stress_test" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "condition_grade" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sealed" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "broken" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "public"."products_broken_tag_enum" AS ENUM('reparable', 'parts');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "broken_tag" "public"."products_broken_tag_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "repair_price" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "warranty_days" integer NOT NULL DEFAULT '90'`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "coverage_extended" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "escrow_protected" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "lat" numeric(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "lng" numeric(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "address" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "city" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "province" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "postal_code" character varying(20)`,
    );

    // orders: cupón y reparación + product_id nullable (createFromCart)
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coupon_code" character varying(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "repair_requested" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "repair_fee" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "product_id" DROP NOT NULL`,
    );

    // ------------------------------------------------------------------
    // 2) Tablas secundarias (antes solo existían vía synchronize)
    // ------------------------------------------------------------------
    await queryRunner.query(
      `CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "balance" numeric(12,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_92558c08091598f7a4439586cda" UNIQUE ("user_id"), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "product_id" uuid NOT NULL, "variation_id" uuid, "quantity" integer NOT NULL DEFAULT '1', "unit_price" numeric(10,2) NOT NULL, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_145532db85752b29c57d2b7b1f" ON "order_items" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_variations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "sku" character varying(80) NOT NULL, "attributes" jsonb, "stock" integer NOT NULL DEFAULT '0', "price_delta" numeric(10,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_353249b2d301e047dde9ef0487c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_99ffcb7287adf3b4134158ddd3" ON "product_variations" ("sku") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_318ea43851e4dcc507601cc9f0" ON "product_variations" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payouts_status_enum" AS ENUM('pending', 'paid', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payouts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "amount" numeric(12,2) NOT NULL, "status" "public"."payouts_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_76855dc4f0a6c18c72eea302e87" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_07ab39a21f69990612b839efa9" ON "payouts" ("user_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wallet_entries_type_enum" AS ENUM('credit', 'debit', 'payout')`,
    );
    await queryRunner.query(
      `CREATE TABLE "wallet_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "wallet_id" character varying NOT NULL, "type" "public"."wallet_entries_type_enum" NOT NULL, "amount" numeric(12,2) NOT NULL, "description" character varying(200) NOT NULL, "order_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_43159f70238df34adbec8b05505" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_740ef809883ce3290b19602778" ON "wallet_entries" ("wallet_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shipments_service_enum" AS ENUM('standard', 'express', 'pickup')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shipments_status_enum" AS ENUM('pending', 'in_transit', 'delivered')`,
    );
    await queryRunner.query(
      `CREATE TABLE "shipments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" character varying NOT NULL, "carrier" character varying(60) NOT NULL, "service" "public"."shipments_service_enum" NOT NULL, "tracking_code" character varying(40) NOT NULL, "status" "public"."shipments_status_enum" NOT NULL DEFAULT 'pending', "cost" numeric(10,2) NOT NULL DEFAULT '0', "estimated_days" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6deda4532ac542a93eab214b564" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e86fac2a18a75dcb82bfbb23f4" ON "shipments" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_targettype_enum" AS ENUM('seller', 'buyer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_status_enum" AS ENUM('pending', 'resolved', 'dismissed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "targetType" "public"."reports_targettype_enum" NOT NULL, "reason" text NOT NULL, "details" text, "status" "public"."reports_status_enum" NOT NULL DEFAULT 'pending', "resolution_notes" text, "reporter_id" uuid NOT NULL, "reported_id" uuid NOT NULL, "resolved_by" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9459b9bf907a3807ef7143d2ea" ON "reports" ("reporter_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2130f824bbdd2538ccb9751cd2" ON "reports" ("reported_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'succeeded', 'failed', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" character varying NOT NULL, "provider" character varying(30) NOT NULL DEFAULT 'mock', "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending', "amount" numeric(10,2) NOT NULL, "external_id" character varying(120), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b2f7b823a21562eeca20e72b00" ON "payments" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('order_created', 'sale', 'order_paid', 'order_shipped', 'order_delivered', 'order_cancelled', 'order_stage', 'review', 'system', 'new_product', 'price_drop', 'back_in_stock', 'delivery_assigned', 'delivery_started', 'delivery_approaching', 'delivery_completed', 'delivery_failed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_channel_enum" AS ENUM('in_app', 'push', 'email', 'sms')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."notifications_type_enum" NOT NULL, "title" character varying(150) NOT NULL, "body" text NOT NULL, "read" boolean NOT NULL DEFAULT false, "channel" "public"."notifications_channel_enum" NOT NULL DEFAULT 'in_app', "metadata" jsonb, "user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c55081b5c7e80fbf397015c2f3" ON "notifications" ("user_id", "read", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ml_webhooks_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'dead_letter')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ml_webhooks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "topic" character varying(100) NOT NULL, "resource" character varying(500) NOT NULL, "user_id" character varying NOT NULL, "signature" character varying(200), "rawBody" text, "status" "public"."ml_webhooks_status_enum" NOT NULL DEFAULT 'pending', "attempts" integer NOT NULL DEFAULT '0', "last_error" text, "next_retry_at" TIMESTAMP WITH TIME ZONE NOT NULL, "received_at" TIMESTAMP WITH TIME ZONE NOT NULL, "processing_time_ms" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3727bc8a18d2cf4d6c4888cea9e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f89461ba4bae1c7c7dfe6509d2" ON "ml_webhooks" ("topic", "received_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_79529e010846a61ac63df7db5f" ON "ml_webhooks" ("status", "next_retry_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af8d5295c0d6d330e1acdecc72" ON "ml_webhooks" ("user_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "ml_webhook_dead_letter" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "original_id" character varying NOT NULL, "topic" character varying(100) NOT NULL, "resource" character varying(500) NOT NULL, "user_id" character varying NOT NULL, "signature" character varying(200), "rawBody" text, "last_error" text, "attempts" integer NOT NULL, "received_at" TIMESTAMP WITH TIME ZONE NOT NULL, "moved_at" TIMESTAMP WITH TIME ZONE NOT NULL, "original_record" jsonb, "replayed" boolean NOT NULL DEFAULT false, "replayed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e2d8378500fad7f8aa9db3b4937" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_089bbd392e98b11cb496efda92" ON "ml_webhook_dead_letter" ("topic", "moved_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fc1556197a0562292d432039e8" ON "ml_webhook_dead_letter" ("original_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "ml_credentials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "ml_user_id" character varying(60), "access_token" text, "refresh_token" text, "expires_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_025cb610d8c428fb5ec0e3ec2c4" UNIQUE ("user_id"), CONSTRAINT "PK_e854a447bb1066026a7289c3353" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "favorites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "product_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_5ed74ffd0060ad5a01107ea552" ON "favorites" ("user_id", "product_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."delivery_routes_zone_enum" AS ENUM('caba', 'gba_norte', 'gba_sur', 'gba_oeste', 'la_plata', 'mar_del_plata', 'bolivar', 'azul', 'tandil', 'olavarria', 'chivilcoy', 'pergamino', 'junin', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."delivery_routes_status_enum" AS ENUM('planned', 'assigned', 'in_progress', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "delivery_routes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "delivery_date" date NOT NULL, "zone" "public"."delivery_routes_zone_enum" NOT NULL, "status" "public"."delivery_routes_status_enum" NOT NULL DEFAULT 'planned', "carrier_id" character varying(100), "carrier_name" character varying(100), "driver_name" character varying(100), "vehicle_plate" character varying(20), "total_distance_km" numeric(10,2) NOT NULL DEFAULT '0', "estimated_duration_minutes" integer NOT NULL DEFAULT '0', "orders_count" integer NOT NULL DEFAULT '0', "started_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "notes" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_114337f048f541ccfe4c5d57140" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_968fccd6c62a69ab650e7f1d23" ON "delivery_routes" ("zone", "delivery_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5d71a5a871f77e3a5438a19d37" ON "delivery_routes" ("delivery_date", "status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."route_stops_status_enum" AS ENUM('pending', 'arrived', 'delivered', 'failed', 'skipped')`,
    );
    await queryRunner.query(
      `CREATE TABLE "route_stops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "route_id" uuid NOT NULL, "order_id" character varying NOT NULL, "sequence" integer NOT NULL, "delivery_address" character varying(500) NOT NULL, "lat" numeric(10,7) NOT NULL, "lng" numeric(10,7) NOT NULL, "contact_name" character varying(100), "contact_phone" character varying(20), "time_window_start" character varying(50), "time_window_end" character varying(50), "status" "public"."route_stops_status_enum" NOT NULL DEFAULT 'pending', "failure_reason" text, "arrived_at" TIMESTAMP WITH TIME ZONE, "delivered_at" TIMESTAMP WITH TIME ZONE, "distance_from_previous_km" numeric(10,2), "travel_time_minutes" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_22c09afc24c0a7a13644c629073" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d93c816228d1289a73b0ca3afd" ON "route_stops" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_84985b8c7a5d38d6864c60b699" ON "route_stops" ("route_id", "sequence") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cart_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cart_id" uuid NOT NULL, "product_id" uuid NOT NULL, "quantity" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_6fccf5ec03c172d27a28a82928b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6385a745d9e12a89b859bb2562" ON "cart_items" ("cart_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "carts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2ec1c94a977b940d85a4f498aea" UNIQUE ("user_id"), CONSTRAINT "REL_2ec1c94a977b940d85a4f498ae" UNIQUE ("user_id"), CONSTRAINT "PK_b5f695a59f5ebb50af3c8160816" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."coupons_type_enum" AS ENUM('percent', 'fixed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "coupons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(40) NOT NULL, "type" "public"."coupons_type_enum" NOT NULL, "value" numeric(10,2) NOT NULL, "min_purchase" numeric(10,2) NOT NULL DEFAULT '0', "expires_at" TIMESTAMP WITH TIME ZONE, "usage_limit" integer, "used_count" integer NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d7ea8864a0150183770f3e9a8cb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e025109230e82925843f2a14c4" ON "coupons" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "analytics_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event" character varying(100) NOT NULL, "page" character varying(255), "product_id" character varying(64), "order_id" character varying(64), "metadata" jsonb, "user_id" character varying(64), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5d643d67a09b55653e98616f421" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9e68dad684f6a278c7f0fd6e30" ON "analytics_events" ("event", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token_hash" character varying(64) NOT NULL, "user_id" uuid NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a7838d2ba25be1342091b6695f1" UNIQUE ("token_hash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens" ("user_id") `,
    );

    // ------------------------------------------------------------------
    // 3) Claves foráneas de las tablas nuevas hacia las tablas base
    // ------------------------------------------------------------------
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_9263386c35b6b242540f9493b00" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations" ADD CONSTRAINT "FK_318ea43851e4dcc507601cc9f08" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_9459b9bf907a3807ef7143d2ead" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_a4f4f08ca7392c630494d1a77f7" FOREIGN KEY ("reported_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ADD CONSTRAINT "FK_35a6b05ee3b624d0de01ee50593" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ADD CONSTRAINT "FK_003e599a9fc0e8f154b6313639f" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_stops" ADD CONSTRAINT "FK_b16cab5c66870949cbb4ee748c0" FOREIGN KEY ("route_id") REFERENCES "delivery_routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_6385a745d9e12a89b859bb25623" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_30e89257a105eab7648a35c7fce" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts" ADD CONSTRAINT "FK_2ec1c94a977b940d85a4f498aea" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts" DROP CONSTRAINT "FK_2ec1c94a977b940d85a4f498aea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_30e89257a105eab7648a35c7fce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_6385a745d9e12a89b859bb25623"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_stops" DROP CONSTRAINT "FK_b16cab5c66870949cbb4ee748c0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" DROP CONSTRAINT "FK_003e599a9fc0e8f154b6313639f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" DROP CONSTRAINT "FK_35a6b05ee3b624d0de01ee50593"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_a4f4f08ca7392c630494d1a77f7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_9459b9bf907a3807ef7143d2ead"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variations" DROP CONSTRAINT "FK_318ea43851e4dcc507601cc9f08"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_9263386c35b6b242540f9493b00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_3ddc983c5f7bcf132fd8732c3f"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9e68dad684f6a278c7f0fd6e30"`,
    );
    await queryRunner.query(`DROP TABLE "analytics_events"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e025109230e82925843f2a14c4"`,
    );
    await queryRunner.query(`DROP TABLE "coupons"`);
    await queryRunner.query(`DROP TYPE "public"."coupons_type_enum"`);
    await queryRunner.query(`DROP TABLE "carts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6385a745d9e12a89b859bb2562"`,
    );
    await queryRunner.query(`DROP TABLE "cart_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_84985b8c7a5d38d6864c60b699"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d93c816228d1289a73b0ca3afd"`,
    );
    await queryRunner.query(`DROP TABLE "route_stops"`);
    await queryRunner.query(`DROP TYPE "public"."route_stops_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5d71a5a871f77e3a5438a19d37"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_968fccd6c62a69ab650e7f1d23"`,
    );
    await queryRunner.query(`DROP TABLE "delivery_routes"`);
    await queryRunner.query(`DROP TYPE "public"."delivery_routes_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."delivery_routes_zone_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5ed74ffd0060ad5a01107ea552"`,
    );
    await queryRunner.query(`DROP TABLE "favorites"`);
    await queryRunner.query(`DROP TABLE "ml_credentials"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fc1556197a0562292d432039e8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_089bbd392e98b11cb496efda92"`,
    );
    await queryRunner.query(`DROP TABLE "ml_webhook_dead_letter"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_af8d5295c0d6d330e1acdecc72"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_79529e010846a61ac63df7db5f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f89461ba4bae1c7c7dfe6509d2"`,
    );
    await queryRunner.query(`DROP TABLE "ml_webhooks"`);
    await queryRunner.query(`DROP TYPE "public"."ml_webhooks_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c55081b5c7e80fbf397015c2f3"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_channel_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b2f7b823a21562eeca20e72b00"`,
    );
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2130f824bbdd2538ccb9751cd2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9459b9bf907a3807ef7143d2ea"`,
    );
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reports_targettype_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e86fac2a18a75dcb82bfbb23f4"`,
    );
    await queryRunner.query(`DROP TABLE "shipments"`);
    await queryRunner.query(`DROP TYPE "public"."shipments_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."shipments_service_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_740ef809883ce3290b19602778"`,
    );
    await queryRunner.query(`DROP TABLE "wallet_entries"`);
    await queryRunner.query(`DROP TYPE "public"."wallet_entries_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_07ab39a21f69990612b839efa9"`,
    );
    await queryRunner.query(`DROP TABLE "payouts"`);
    await queryRunner.query(`DROP TYPE "public"."payouts_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_318ea43851e4dcc507601cc9f0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_99ffcb7287adf3b4134158ddd3"`,
    );
    await queryRunner.query(`DROP TABLE "product_variations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_145532db85752b29c57d2b7b1f"`,
    );
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "wallets"`);

    // Revierte las columnas agregadas a las tablas base
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "product_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "repair_fee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "repair_requested"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "discount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "coupon_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "postal_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "province"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "city"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "lng"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "lat"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "escrow_protected"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "coverage_extended"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "warranty_days"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "repair_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "broken_tag"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "broken"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "sealed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "verified"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "condition_grade"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "stress_test"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "usage_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "reported_hours_of_use"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."products_broken_tag_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "postal_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "province"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "city"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lng"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lat"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "otp_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "otp_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "otp_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "document_verified"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "phone_verified"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "accepts_testing"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "push_token"`,
    );
  }
}
