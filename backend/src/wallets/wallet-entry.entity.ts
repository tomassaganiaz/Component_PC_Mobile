import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export enum WalletEntryType {
  CREDIT = "credit",
  DEBIT = "debit",
  PAYOUT = "payout",
}

@Entity("wallet_entries")
@Index(["walletId", "createdAt"])
export class WalletEntry {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "wallet_id" })
  walletId: string;

  @Column({ type: "enum", enum: WalletEntryType })
  type: WalletEntryType;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 200 })
  description: string;

  @Column({ type: "uuid", name: "order_id", nullable: true })
  orderId: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
