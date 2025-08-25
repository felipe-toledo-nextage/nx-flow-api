import { IsOptional, IsString, MinLength, IsEmail, IsEnum } from 'class-validator';
import { UserRole, UserStatus } from '../entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email deve ser um email válido' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  password?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role deve ser admin, user ou manager' })
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Status deve ser active, inactive, pending ou suspended' })
  status?: UserStatus;

  @IsOptional()
  @IsString({ message: 'Telefone deve ser uma string' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Avatar deve ser uma string' })
  avatar?: string;

  @IsOptional()
  @IsString({ message: 'Token de verificação deve ser uma string' })
  emailVerificationToken?: string;

  @IsOptional()
  @IsString({ message: 'Token de reset de senha deve ser uma string' })
  passwordResetToken?: string;
}
