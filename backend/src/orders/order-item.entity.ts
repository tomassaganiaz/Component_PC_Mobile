import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Order } from "./order.entity";
import { Product } from "../products/product.entity";

@Entity("order_items")
@Index(["orderId"])
export class OrderItemEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;

  @Column({ name: "order_id" })
  orderId: string;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ name: "product_id" })
  productId: string;

  @Column({ type: "integer", default: 1 })
  quantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2, name: "unit_price" })
  unitPrice: number;
}
