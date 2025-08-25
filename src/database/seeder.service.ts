import { Injectable, OnModuleInit } from '@nestjs/common';
import { UserSeed } from './seeds/user.seed';

@Injectable()
export class SeederService implements OnModuleInit {
  constructor(
    private readonly userSeed: UserSeed,
  ) {}

  async onModuleInit() {
    console.log('🌱 Iniciando seeders...');
    await this.runAllSeeds();
    console.log('✅ Seeders concluídos!');
  }

  private async runAllSeeds() {
    try {
      await this.userSeed.run();
    } catch (error) {
      console.error('❌ Erro ao executar seeders:', error);
    }
  }
}
