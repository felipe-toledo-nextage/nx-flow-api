import { ProjectStatus, ProjectHealth, ProjectPriority } from '../entities/project.entity';

export interface ProjectResponse {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  health: ProjectHealth;
  priority: ProjectPriority;
  startDate?: string;
  endDate?: string;
  jiraUrl?: string;
  jiraEmail?: string;
  jiraApiToken?: string;
  jiraProjectKey?: string;
  settings?: Record<string, any>;
  director: {
    id: number;
    name: string;
    email: string;
  };
  manager?: {
    id: number;
    name: string;
    email: string;
  };
  clients?: Array<{
    id: number;
    name: string;
    email: string;
  }>;
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
}
