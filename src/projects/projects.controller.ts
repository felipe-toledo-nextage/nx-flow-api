import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectStatus, ProjectHealth } from './entities/project.entity';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(@Body() createProjectDto: CreateProjectDto) {
    const project = await this.projectsService.create(createProjectDto);
    return {
      message: 'Projeto criado com sucesso',
      project,
    };
  }

  @Get()
  async findAll(@Query() queryDto: QueryProjectDto) {
    return this.projectsService.findAll(queryDto);
  }

  @Get('stats')
  async getStats() {
    return this.projectsService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const project = await this.projectsService.findById(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return project;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    const project = await this.projectsService.update(id, updateProjectDto);
    return {
      message: 'Projeto atualizado com sucesso',
      project,
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.projectsService.delete(id);
    return {
      message: 'Projeto removido com sucesso',
    };
  }

  @Patch(':id/status')
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ProjectStatus,
  ) {
    const project = await this.projectsService.changeStatus(id, status);
    return {
      message: 'Status do projeto atualizado com sucesso',
      project,
    };
  }

  @Patch(':id/health')
  async changeHealth(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('health') health: ProjectHealth,
  ) {
    const project = await this.projectsService.changeHealth(id, health);
    return {
      message: 'Health do projeto atualizado com sucesso',
      project,
    };
  }

  @Patch(':id/progress')
  async updateProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('progress') progress: number,
  ) {
    const project = await this.projectsService.updateProgress(id, progress);
    return {
      message: 'Progresso do projeto atualizado com sucesso',
      project,
    };
  }

  @Patch(':id/velocity')
  async updateVelocity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('velocity') velocity: number,
  ) {
    const project = await this.projectsService.updateVelocity(id, velocity);
    return {
      message: 'Velocity do projeto atualizado com sucesso',
      project,
    };
  }

  @Patch(':id/scope-delivered')
  async updateScopeDelivered(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('scopeDelivered') scopeDelivered: number,
  ) {
    const project = await this.projectsService.updateScopeDelivered(id, scopeDelivered);
    return {
      message: 'Scope delivered do projeto atualizado com sucesso',
      project,
    };
  }
}
