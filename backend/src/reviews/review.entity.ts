import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { Order } from '../orders/order.entity';

export enum ReviewType {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  COMPLAINT = 'complaint',
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RESOLVED = 'resolved',
}

export enum TrustBadge {
  SAFE = 'safe',
  INTERMEDIATE = 'intermediate',
  UNSAFE = 'unsafe',
}

@Entity('reviews')
@Index(['buyerId', 'productId'], { unique: true })
@Index(['sellerId', 'status'])
@Index(['productId', 'status'])
@Check(`"rating" >= 1 AND "rating" <= 5`)
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'enum', enum: ReviewType })
  type: ReviewType;

  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PENDING })
  status: ReviewStatus;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'smallint', nullable: true, name: 'seller_rating' })
  sellerRating: number;

  @Column({ type: 'smallint', nullable: true, name: 'product_rating' })
  productRating: number;

  @Column({ type: 'text', nullable: true, name: 'complaint_reason' })
  complaintReason: string;

  @Column({ type: 'text', nullable: true, name: 'resolution_notes' })
  resolutionNotes: string;

  @Column({ type: 'boolean', default: false, name: 'is_verified_purchase' })
  isVerifiedPurchase: boolean;

  // Relations
  @ManyToOne(() => User, (user) => user.reviewsGiven, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @ManyToOne(() => User, (user) => user.reviewsReceived, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => Product, (product) => product.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver: User;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
