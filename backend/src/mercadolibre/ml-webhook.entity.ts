import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum WebhookStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  DEAD_LETTER = "dead_letter",
}

@Entity("ml_webhooks")
@Index(["userId", "status"])
@Index(["status", "nextRetryAt"])
@Index(["topic", "receivedAt"])
export class MlWebhook {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  topic: string;

  @Column({ type: "varchar", length: 500 })
  resource: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  signature: string;

  @Column({ type: "text", nullable: true })
  rawBody: string;

  @Column({
    type: "enum",
    enum: WebhookStatus,
    default: WebhookStatus.PENDING,
  })
  status: WebhookStatus;

  @Column({ type: "integer", default: 0 })
  attempts: number;

  @Column({ type: "text", nullable: true, name: "last_error" })
  lastError: string;

  @Column({ type: "timestamptz", name: "next_retry_at" })
  nextRetryAt: Date;

  @Column({ type: "timestamptz", name: "received_at" })
  receivedAt: Date;

  @Column({ type: "integer", nullable: true, name: "processing_time_ms" })
  processingTimeMs: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}

@Entity("ml_webhook_dead_letter")
@Index(["originalId"])
@Index(["topic", "movedAt"])
export class MlWebhookDeadLetter {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "original_id" })
  originalId: string;

  @Column({ type: "varchar", length: 100 })
  topic: string;

  @Column({ type: "varchar", length: 500 })
  resource: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  signature: string;

  @Column({ type: "text", nullable: true })
  rawBody: string;

  @Column({ type: "text", nullable: true, name: "last_error" })
  lastError: string;

  @Column({ type: "integer", name: "attempts" })
  attempts: number;

  @Column({ type: "timestamptz", name: "received_at" })
  receivedAt: Date;

  @Column({ type: "timestamptz", name: "moved_at" })
  movedAt: Date;

  @Column({ type: "jsonb", nullable: true, name: "original_record" })
  originalRecord: Record<string, any>;

  @Column({ type: "boolean", default: false, name: "replayed" })
  replayed: boolean;

  @Column({ type: "timestamptz", nullable: true, name: "replayed_at" })
  replayedAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
