import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
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
  @PrimaryGeneratedColumn()
  id: number;

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


  @Column({ type: 'date', nullable: true })
  startDate?: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  // Configurações do Jira
  @Column({ type: 'varchar', length: 255, nullable: true })
  jiraUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  jiraEmail?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  jiraApiToken?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  jiraProjectKey?: string;

  // Configurações adicionais

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  // Relacionamentos
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'director_id' })
  director: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager?: User;

  @ManyToMany(() => User, user => user.clientProjects)
  @JoinTable({
    name: 'project_clients',
    joinColumn: {
      name: 'project_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'client_id',
      referencedColumnName: 'id'
    }
  })
  clients: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt?: Date;
}
