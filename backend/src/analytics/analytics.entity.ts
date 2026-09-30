import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('analytics_events')
@Index(['event', 'createdAt'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  event: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  page: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'product_id' })
  productId: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'order_id' })
  orderId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}