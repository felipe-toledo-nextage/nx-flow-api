import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UserResponse, PaginatedUsersResponse, UserProfileResponse } from './interfaces/user-response.interface';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(queryDto: QueryUserDto): Promise<PaginatedUsersResponse> {
    const { page = 1, limit = 10, search, role, status, orderBy = 'createdAt', order = 'DESC' } = queryDto;
    
    const skip = (page - 1) * limit;
    const where: FindOptionsWhere<User> = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const [users, total] = await this.usersRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { [orderBy]: order },
      select: ['id', 'name', 'email', 'role', 'status', 'phone', 'avatar', 'lastLoginAt', 'emailVerifiedAt', 'createdAt', 'updatedAt'],
    });

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      users: users.map(user => this.mapToUserResponse(user)),
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByIdWithPassword(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { id },
      select: ['id', 'name', 'email', 'password', 'role', 'status', 'phone', 'avatar', 'lastLoginAt', 'emailVerifiedAt', 'createdAt', 'updatedAt']
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { email },
      select: ['id', 'name', 'email', 'password', 'role', 'status', 'phone', 'avatar', 'lastLoginAt', 'emailVerifiedAt', 'createdAt', 'updatedAt']
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Usuário já existe com este email');
    }

    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se o email já existe (se estiver sendo atualizado)
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email já está em uso');
      }
    }

    // Se a senha estiver sendo atualizada, hash ela
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    await this.usersRepository.update(id, updateUserDto);
    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new NotFoundException('Erro ao atualizar usuário');
    }
    return updatedUser;
  }

  async delete(id: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.usersRepository.remove(user);
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date() });
  }

  async updatePassword(id: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersRepository.update(id, { password: hashedPassword });
  }

  async verifyEmail(id: number): Promise<void> {
    await this.usersRepository.update(id, { 
      emailVerifiedAt: new Date(),
      emailVerificationToken: undefined,
    });
  }

  async setPasswordResetToken(id: string, token: string, expiresAt: Date): Promise<void> {
    await this.usersRepository.update(id, {
      passwordResetToken: token,
      passwordResetTokenExpiresAt: expiresAt,
    });
  }

  async clearPasswordResetToken(id: number): Promise<void> {
    await this.usersRepository.update(id, {
      passwordResetToken: undefined,
      passwordResetTokenExpiresAt: undefined,
    });
  }

  async changeStatus(id: number, status: UserStatus): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.usersRepository.update(id, { status });
    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new NotFoundException('Erro ao atualizar status do usuário');
    }
    return updatedUser;
  }

  async changeRole(id: number, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.usersRepository.update(id, { role });
    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new NotFoundException('Erro ao atualizar role do usuário');
    }
    return updatedUser;
  }

  async getProfile(id: number): Promise<UserProfileResponse> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.mapToUserResponse(user);
  }

  private mapToUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone,
      avatar: user.avatar,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Método para criar usuário admin padrão
  async createDefaultAdmin(): Promise<void> {
    const existingAdmin = await this.findByEmail('admin@teste.com');
    if (!existingAdmin) {
      const adminUser = this.usersRepository.create({
        name: 'Admin',
        email: 'admin@teste.com',
        password: 'admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      });
      await this.usersRepository.save(adminUser);
      console.log('👤 Usuário admin criado: admin@teste.com / admin');
    } else {
      console.log('👤 Usuário admin já existe: admin@teste.com');
    }
  }
}
