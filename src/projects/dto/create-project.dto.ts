import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString, IsArray, IsUUID, Min, Max } from 'class-validator';
import { ProjectStatus, ProjectHealth, ProjectPriority } from '../entities/project.entity';

export class CreateProjectDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

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
  @IsNumber({}, { message: 'Progresso deve ser um número' })
  @Min(0, { message: 'Progresso deve ser maior ou igual a 0' })
  @Max(100, { message: 'Progresso deve ser menor ou igual a 100' })
  progress?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Velocity deve ser um número' })
  @Min(0, { message: 'Velocity deve ser maior ou igual a 0' })
  velocity?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Scope delivered deve ser um número' })
  @Min(0, { message: 'Scope delivered deve ser maior ou igual a 0' })
  @Max(100, { message: 'Scope delivered deve ser menor ou igual a 100' })
  scopeDelivered?: number;

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
  @IsString({ message: 'Username do Jira deve ser uma string' })
  jiraUsername?: string;

  @IsOptional()
  @IsString({ message: 'API Token do Jira deve ser uma string' })
  jiraApiToken?: string;

  @IsOptional()
  @IsString({ message: 'Project Key do Jira deve ser uma string' })
  jiraProjectKey?: string;

  @IsOptional()
  @IsString({ message: 'Board ID do Jira deve ser uma string' })
  jiraBoardId?: string;

  // Configurações adicionais
  @IsOptional()
  @IsString({ message: 'URL do repositório deve ser uma string' })
  repositoryUrl?: string;

  @IsOptional()
  @IsString({ message: 'URL da documentação deve ser uma string' })
  documentationUrl?: string;

  @IsOptional()
  @IsArray({ message: 'Tags deve ser um array' })
  @IsString({ each: true, message: 'Cada tag deve ser uma string' })
  tags?: string[];

  @IsOptional()
  settings?: Record<string, any>;

  // Relacionamentos
  @IsUUID('4', { message: 'ID do diretor deve ser um UUID válido' })
  director: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID do manager deve ser um UUID válido' })
  manager?: string;
}
