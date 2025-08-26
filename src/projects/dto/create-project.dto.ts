import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsNumber, IsArray, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus, ProjectHealth, ProjectPriority } from '../entities/project.entity';

export class CreateClientDto {
  @IsNotEmpty({ message: 'Email é obrigatório' })
  @IsEmail({}, { message: 'Email deve ser válido' })
  email: string;

  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @IsString({ message: 'Senha deve ser uma string' })
  password: string;
}

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
  @IsNumber({}, { message: 'ID do diretor deve ser um número válido' })
  director: number;

  @IsOptional()
  @IsNumber({}, { message: 'ID do manager deve ser um número válido' })
  manager?: number;

  @IsOptional()
  @IsArray({ message: 'Clients deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => CreateClientDto)
  clients?: CreateClientDto[];
}
