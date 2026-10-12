import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export enum CouponType {
  PERCENT = "percent",
  FIXED = "fixed",
}

@Entity("coupons")
export class Coupon {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 40 })
  code: string;

  @Column({ type: "enum", enum: CouponType })
  type: CouponType;

  /** Porcentaje (0-100) si es percent; monto fijo si es fixed. */
  @Column({ type: "decimal", precision: 10, scale: 2 })
  value: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
    name: "min_purchase",
  })
  minPurchase: number;

  @Column({ type: "timestamptz", nullable: true, name: "expires_at" })
  expiresAt: Date | null;

  @Column({ type: "integer", nullable: true, name: "usage_limit" })
  usageLimit: number | null;

  @Column({ type: "integer", default: 0, name: "used_count" })
  usedCount: number;

  @Column({ type: "boolean", default: true })
  active: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
