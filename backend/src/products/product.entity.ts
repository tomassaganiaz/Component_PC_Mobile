import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Verification } from '../verifications/verification.entity';
import { Review } from '../reviews/review.entity';

export enum ProductCondition {
  NEW = 'new',
  USED = 'used',
}

export enum ProductCategory {
  CPU = 'cpu',
  GPU = 'gpu',
  RAM = 'ram',
  STORAGE = 'storage',
  MOTHERBOARD = 'motherboard',
  PSU = 'psu',
  CASE = 'case',
  COOLING = 'cooling',
  MONITOR = 'monitor',
  KEYBOARD = 'keyboard',
  MOUSE = 'mouse',
  PHONE = 'phone',
  TABLET = 'tablet',
  OTHER = 'other',
}

export enum ProductStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  VERIFIED = 'verified',
  PUBLISHED = 'published',
  SOLD = 'sold',
}

@Entity('products')
@Index(['status', 'category'])
@Index(['sellerId', 'status'])
@Index(['condition', 'status'])
@Index(['price'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'enum', enum: ProductCondition })
  condition: ProductCondition;

  @Column({ type: 'enum', enum: ProductCategory })
  category: ProductCategory;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @Column({ type: 'integer', nullable: true, name: 'hours_of_use' })
  hoursOfUse: number;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'physical_state' })
  physicalState: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  model: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, name: 'average_rating' })
  averageRating: number;

  @Column({ type: 'integer', default: 0, name: 'review_count' })
  reviewCount: number;

  // Relations
  @ManyToOne(() => User, (user) => user.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @OneToMany(() => Verification, (verification) => verification.product)
  verifications: Verification[];

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;
}
