import { IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { ProjectStatus, ProjectHealth, ProjectPriority } from '../entities/project.entity';

export class UpdateProjectDto {
  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Descrição deve ser uma string' })
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'Status deve ser active, completed, paused ou cancelled' })
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectHealth, { message: 'Health deve ser healthy, warning ou critical' })
  health?: ProjectHealth;

  @IsOptional()
  @IsEnum(ProjectPriority, { message: 'Priority deve ser low, medium, high ou urgent' })
  priority?: ProjectPriority;


  @IsOptional()
  @IsDateString({}, { message: 'Data de início deve ser uma data válida' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data de fim deve ser uma data válida' })
  endDate?: string;

  // Configurações do Jira
  @IsOptional()
  @IsString({ message: 'URL do Jira deve ser uma string' })
  jiraUrl?: string;

  @IsOptional()
  @IsString({ message: 'Email do Jira deve ser uma string' })
  jiraEmail?: string;

  @IsOptional()
  @IsString({ message: 'API Token do Jira deve ser uma string' })
  jiraApiToken?: string;

  @IsOptional()
  @IsString({ message: 'Project Key do Jira deve ser uma string' })
  jiraProjectKey?: string;

  // Configurações adicionais

  @IsOptional()
  settings?: Record<string, any>;

  // Relacionamentos
  @IsOptional()
  @IsNumber({}, { message: 'ID do manager deve ser um número válido' })
  manager?: number;
}
