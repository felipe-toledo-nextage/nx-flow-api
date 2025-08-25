import { ProjectStatus, ProjectHealth, ProjectPriority } from '../entities/project.entity';

export interface ProjectResponse {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  health: ProjectHealth;
  priority: ProjectPriority;
  progress: number;
  velocity: number;
  scopeDelivered: number;
  startDate?: string;
  endDate?: string;
  jiraUrl?: string;
  jiraUsername?: string;
  jiraApiToken?: string;
  jiraProjectKey?: string;
  jiraBoardId?: string;
  repositoryUrl?: string;
  documentationUrl?: string;
  tags?: string[];
  settings?: Record<string, any>;
  director: {
    id: string;
    name: string;
    email: string;
  };
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
}

export interface PaginatedProjectsResponse {
  projects: ProjectResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ProjectStatsResponse {
  total: number;
  active: number;
  completed: number;
  paused: number;
  cancelled: number;
  healthy: number;
  warning: number;
  critical: number;
  averageProgress: number;
  averageVelocity: number;
}
