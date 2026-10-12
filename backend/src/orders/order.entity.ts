import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../users/user.entity";
import { Product } from "../products/product.entity";
import { OrderItemEntity } from "./order-item.entity";

export enum OrderStatus {
  PENDING = "pending",
  PAID = "paid",
  IN_CUSTODY = "in_custody",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

@Entity("orders")
@Index(["buyerId", "status"])
@Index(["status", "createdAt"])
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total: number;

  @Column({ type: "enum", enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({
    type: "varchar",
    length: 500,
    nullable: true,
    name: "shipping_address",
  })
  shippingAddress: string;

  @Column({
    type: "varchar",
    length: 50,
    nullable: true,
    name: "payment_method",
  })
  paymentMethod: string;

  @Column({ type: "timestamptz", nullable: true, name: "custody_start_date" })
  custodyStartDate: Date;

  @Column({ type: "timestamptz", nullable: true, name: "custody_end_date" })
  custodyEndDate: Date;

  @Column({ type: "text", nullable: true, name: "cancellation_reason" })
  cancellationReason: string;

  @Column({ type: "varchar", length: 40, nullable: true, name: "coupon_code" })
  couponCode: string | null;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  discount: number;

  // Relations
  @ManyToOne(() => User, (user) => user.orders, { onDelete: "CASCADE" })
  @JoinColumn({ name: "buyer_id" })
  buyer: User;

  @Column({ name: "buyer_id" })
  buyerId: string;

  @ManyToOne(() => Product, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "product_id" })
  product: Product | null;

  @Column({ name: "product_id", type: "uuid", nullable: true })
  productId: string | null;

  /** Ítems de la orden (carrito / compra directa). */
  @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true })
  items: OrderItemEntity[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
