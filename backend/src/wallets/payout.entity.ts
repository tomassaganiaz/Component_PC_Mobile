import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export enum PayoutStatus {
  PENDING = "pending",
  PAID = "paid",
  REJECTED = "rejected",
}

@Entity("payouts")
@Index(["userId", "status"])
export class Payout {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "enum", enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
