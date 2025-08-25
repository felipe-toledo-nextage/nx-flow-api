import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { UserRole, UserStatus } from '../users/entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    console.log('🚀 Inicializando banco de dados...');

    // Criar usuário admin padrão
    await usersService.createDefaultAdmin();
    console.log('✅ Usuário admin criado com sucesso!');

    console.log('🎉 Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
