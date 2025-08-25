import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ProjectStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export enum ProjectHealth {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.ACTIVE,
  })
  status: ProjectStatus;

  @Column({
    type: 'enum',
    enum: ProjectHealth,
    default: ProjectHealth.HEALTHY,
  })
  health: ProjectHealth;

  @Column({
    type: 'enum',
    enum: ProjectPriority,
    default: ProjectPriority.MEDIUM,
  })
  priority: ProjectPriority;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  velocity: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  scopeDelivered: number;

  @Column({ type: 'date', nullable: true })
  startDate?: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  // Configurações do Jira
  @Column({ type: 'varchar', length: 255, nullable: true })
  jiraUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  jiraUsername?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  jiraApiToken?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  jiraProjectKey?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  jiraBoardId?: string;

  // Configurações adicionais
  @Column({ type: 'varchar', length: 255, nullable: true })
  repositoryUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  documentationUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  // Relacionamentos
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'director_id' })
  director: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager?: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt?: Date;
}
