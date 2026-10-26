import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../users/user.entity";

export enum NotificationType {
  ORDER_CREATED = "order_created",
  SALE = "sale",
  ORDER_PAID = "order_paid",
  ORDER_SHIPPED = "order_shipped",
  ORDER_DELIVERED = "order_delivered",
  ORDER_CANCELLED = "order_cancelled",
  ORDER_STAGE = "order_stage",
  REVIEW = "review",
  SYSTEM = "system",
  NEW_PRODUCT = "new_product",
  PRICE_DROP = "price_drop",
  BACK_IN_STOCK = "back_in_stock",
  DELIVERY_ASSIGNED = "delivery_assigned",
  DELIVERY_STARTED = "delivery_started",
  DELIVERY_APPROACHING = "delivery_approaching",
  DELIVERY_COMPLETED = "delivery_completed",
  DELIVERY_FAILED = "delivery_failed",
}

export enum NotificationChannel {
  IN_APP = "in_app",
  PUSH = "push",
  EMAIL = "email",
  SMS = "sms",
}

@Entity("notifications")
@Index(["userId", "read", "createdAt"])
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "enum", enum: NotificationType })
  type: NotificationType;

  @Column({ type: "varchar", length: 150 })
  title: string;

  @Column({ type: "text" })
  body: string;

  @Column({ type: "boolean", default: false })
  read: boolean;

  @Column({
    type: "enum",
    enum: NotificationChannel,
    default: NotificationChannel.IN_APP,
  })
  channel: NotificationChannel;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  // Relations
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
