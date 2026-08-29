import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

export enum VerificationResult {
  PASS = 'pass',
  FAIL = 'fail',
  CONDITIONAL = 'conditional',
}

@Entity('verifications')
@Index(['productId', 'result'])
@Index(['verifiedBy'])
export class Verification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: VerificationResult })
  result: VerificationResult;

  @Column({ type: 'text' })
  notes: string;

  @Column({ type: 'integer', nullable: true, name: 'hours_of_use' })
  hoursOfUse: number;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'physical_state' })
  physicalState: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'functional_test' })
  functionalTest: string;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'cosmetic_grade' })
  cosmeticGrade: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, name: 'quality_score' })
  qualityScore: number;

  // Relations
  @ManyToOne(() => Product, (product) => product.verifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifier: User;

  @Column({ name: 'verified_by' })
  verifiedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
