import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { UserRole, UserStatus } from '../../users/entities/user.entity';

@Injectable()
export class UserSeed {
  constructor(private readonly usersService: UsersService) {}

  async run() {
    console.log('👥 Executando seeder de usuários...');
    
    // Criar usuário admin padrão
    await this.createDefaultAdmin();
    
    // Criar usuários de exemplo (opcional)
    await this.createExampleUsers();
    
    console.log('✅ Seeder de usuários concluído!');
  }

  private async createDefaultAdmin() {
    const existingAdmin = await this.usersService.findByEmail('admin@teste.com');
    
    if (!existingAdmin) {
      const adminUser = await this.usersService.create({
        name: 'Administrador',
        email: 'admin@teste.com',
        password: 'admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });
      
      console.log('👤 Usuário admin criado:', adminUser.email);
    } else {
      console.log('👤 Usuário admin já existe:', existingAdmin.email);
    }
  }

  private async createExampleUsers() {
    const exampleUsers = [
      {
        name: 'João Silva',
        email: 'joao@teste.com',
        password: '123456',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
      {
        name: 'Maria Santos',
        email: 'maria@teste.com',
        password: '123456',
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
      },
    ];

    for (const userData of exampleUsers) {
      const existingUser = await this.usersService.findByEmail(userData.email);
      
      if (!existingUser) {
        try {
          await this.usersService.create(userData);
          console.log('👤 Usuário de exemplo criado:', userData.email);
        } catch (error) {
          console.log('⚠️ Erro ao criar usuário de exemplo:', userData.email, error.message);
        }
      } else {
        console.log('👤 Usuário de exemplo já existe:', userData.email);
      }
    }
  }
}
