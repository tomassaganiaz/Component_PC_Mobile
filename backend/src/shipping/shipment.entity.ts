import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum ShipmentService {
  STANDARD = "standard",
  EXPRESS = "express",
  PICKUP = "pickup",
}

export enum ShipmentStatus {
  PENDING = "pending",
  IN_TRANSIT = "in_transit",
  DELIVERED = "delivered",
}

@Entity("shipments")
@Index(["orderId"])
export class Shipment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "order_id" })
  orderId: string;

  @Column({ type: "varchar", length: 60 })
  carrier: string;

  @Column({ type: "enum", enum: ShipmentService })
  service: ShipmentService;

  @Column({ type: "varchar", length: 40, name: "tracking_code" })
  trackingCode: string;

  @Column({
    type: "enum",
    enum: ShipmentStatus,
    default: ShipmentStatus.PENDING,
  })
  status: ShipmentStatus;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  cost: number;

  @Column({ type: "integer", name: "estimated_days" })
  estimatedDays: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
