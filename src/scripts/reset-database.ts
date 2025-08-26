import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    console.log('🗑️ Resetando banco de dados...');

    const dataSource = app.get<DataSource>(getDataSourceToken());
    
    // Drop all tables
    console.log('📋 Removendo todas as tabelas...');
    await dataSource.dropDatabase();
    
    // Recreate schema
    console.log('🏗️ Recriando schema do banco...');
    await dataSource.synchronize(true);

    console.log('✅ Banco de dados resetado com sucesso!');
    console.log('💡 Execute "npm run db:init" para criar dados iniciais');
    
  } catch (error) {
    console.error('❌ Erro ao resetar banco de dados:', error);
  } finally {
    await app.close();
  }
}

bootstrap();