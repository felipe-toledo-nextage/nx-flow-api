import { Module } from '@nestjs/common';
import { ScopeAIController } from './scope-ai.controller';
import { ScopeAIService } from './scope-ai.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [ScopeAIController],
  providers: [ScopeAIService],
  exports: [ScopeAIService],
})
export class ScopeAIModule {}