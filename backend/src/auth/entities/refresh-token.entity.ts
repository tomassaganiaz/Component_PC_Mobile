import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('refresh_tokens')
@Index(['userId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** SHA-256 del token de refresco (nunca se guarda en claro) */
  @Column({ type: 'varchar', length: 64, unique: true, name: 'token_hash' })
  tokenHash: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'boolean', default: false })
  revoked: boolean;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}