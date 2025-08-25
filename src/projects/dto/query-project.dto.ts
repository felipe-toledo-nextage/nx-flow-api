import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus, ProjectHealth, ProjectPriority } from '../entities/project.entity';

export class QueryProjectDto {
  @IsOptional()
  @IsString({ message: 'Busca deve ser uma string' })
  search?: string;

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
  @IsString({ message: 'Director ID deve ser uma string' })
  director?: string;

  @IsOptional()
  @IsString({ message: 'Manager ID deve ser uma string' })
  manager?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Página deve ser um número' })
  @Min(1, { message: 'Página deve ser maior que 0' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limite deve ser um número' })
  @Min(1, { message: 'Limite deve ser maior que 0' })
  @Max(100, { message: 'Limite deve ser menor ou igual a 100' })
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'Ordenação deve ser uma string' })
  orderBy?: string = 'createdAt';

  @IsOptional()
  @IsString({ message: 'Ordem deve ser ASC ou DESC' })
  order?: 'ASC' | 'DESC' = 'DESC';
}
