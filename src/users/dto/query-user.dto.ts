import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UserRole, UserStatus } from '../entities/user.entity';

export class QueryUserDto {
  @IsOptional()
  @IsString({ message: 'Busca deve ser uma string' })
  search?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role deve ser admin, user ou manager' })
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Status deve ser active, inactive, pending ou suspended' })
  status?: UserStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Página deve ser um número' })
  @Min(1, { message: 'Página deve ser maior que 0' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limite deve ser um número' })
  @Min(1, { message: 'Limite deve ser maior que 0' })
  @Max(100, { message: 'Limite deve ser menor que 100' })
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'Ordenação deve ser uma string' })
  orderBy?: string = 'createdAt';

  @IsOptional()
  @IsString({ message: 'Direção deve ser uma string' })
  order?: 'ASC' | 'DESC' = 'DESC';
}
