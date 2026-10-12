import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Product } from "./product.entity";

@Entity("product_variations")
@Index(["productId"])
export class ProductVariation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Product, (product) => product.variations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ name: "product_id" })
  productId: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 80 })
  sku: string;

  @Column({ type: "jsonb", nullable: true })
  attributes: Record<string, string> | null;

  @Column({ type: "integer", default: 0 })
  stock: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
    name: "price_delta",
  })
  priceDelta: number;
}
