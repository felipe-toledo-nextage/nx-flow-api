import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { POController } from './po.controller';
import { POService } from './po.service';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [POController],
  providers: [POService],
  exports: [POService],
})
export class POModule {}