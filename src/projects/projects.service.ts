import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Project, ProjectStatus, ProjectHealth, ProjectPriority } from './entities/project.entity';
import { User } from '../users/entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { ProjectResponse, PaginatedProjectsResponse, ProjectStatsResponse } from './interfaces/project-response.interface';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    private usersService: UsersService,
  ) {}

  async findAll(queryDto: QueryProjectDto): Promise<PaginatedProjectsResponse> {
    const { page = 1, limit = 10, search, status, health, priority, director, manager, orderBy = 'createdAt', order = 'DESC' } = queryDto;
    
    const skip = (page - 1) * limit;
    const where: FindOptionsWhere<Project> = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (status) {
      where.status = status;
    }

    if (health) {
      where.health = health;
    }

    if (priority) {
      where.priority = priority;
    }

    if (director) {
      where.director = { id: director } as any;
    }

    if (manager) {
      where.manager = { id: manager } as any;
    }

    const [projects, total] = await this.projectsRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { [orderBy]: order },
      relations: ['director', 'manager'],
    });

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      projects: projects.map(project => this.mapToProjectResponse(project)),
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findById(id: string): Promise<Project | null> {
    return this.projectsRepository.findOne({ 
      where: { id },
      relations: ['director', 'manager'],
    });
  }

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    console.log('🔍 Dados recebidos para criar projeto:', createProjectDto);
    
    // Verificar se o diretor existe
    const director = await this.usersService.findById(createProjectDto.director);
    if (!director) {
      throw new NotFoundException('Diretor não encontrado');
    }
    console.log('✅ Diretor encontrado:', director.name);

    // Verificar se o manager existe (se fornecido)
    let manager: User | undefined = undefined;
    if (createProjectDto.manager) {
      const managerUser = await this.usersService.findById(createProjectDto.manager);
      if (!managerUser) {
        throw new NotFoundException('Manager não encontrado');
      }
      manager = managerUser;
    }

    // Criar o projeto com os relacionamentos
    const project = new Project();
    project.name = createProjectDto.name;
    project.description = createProjectDto.description;
    project.status = createProjectDto.status || ProjectStatus.ACTIVE;
    project.health = createProjectDto.health || ProjectHealth.HEALTHY;
    project.priority = createProjectDto.priority || ProjectPriority.MEDIUM;
    project.progress = createProjectDto.progress || 0;
    project.velocity = createProjectDto.velocity || 0;
    project.scopeDelivered = createProjectDto.scopeDelivered || 0;
    project.startDate = createProjectDto.startDate ? new Date(createProjectDto.startDate) : undefined;
    project.endDate = createProjectDto.endDate ? new Date(createProjectDto.endDate) : undefined;
    project.jiraUrl = createProjectDto.jiraUrl;
    project.jiraUsername = createProjectDto.jiraUsername;
    project.jiraApiToken = createProjectDto.jiraApiToken;
    project.jiraProjectKey = createProjectDto.jiraProjectKey;
    project.jiraBoardId = createProjectDto.jiraBoardId;
    project.repositoryUrl = createProjectDto.repositoryUrl;
    project.documentationUrl = createProjectDto.documentationUrl;
    project.tags = createProjectDto.tags || [];
    project.settings = createProjectDto.settings || {};
    project.director = director;
    project.manager = manager;

    console.log('🏗️ Projeto criado (antes de salvar):', project);
    
    const savedProject = await this.projectsRepository.save(project);
    console.log('✅ Projeto salvo com sucesso:', savedProject.id);
    
    return savedProject;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    // Verificar se o manager existe (se fornecido)
    let manager: User | undefined = undefined;
    if (updateProjectDto.manager) {
      const managerUser = await this.usersService.findById(updateProjectDto.manager);
      if (!managerUser) {
        throw new NotFoundException('Manager não encontrado');
      }
      manager = managerUser;
    }

    // Atualizar apenas os campos fornecidos
    if (updateProjectDto.name !== undefined) project.name = updateProjectDto.name;
    if (updateProjectDto.description !== undefined) project.description = updateProjectDto.description;
    if (updateProjectDto.status !== undefined) project.status = updateProjectDto.status;
    if (updateProjectDto.health !== undefined) project.health = updateProjectDto.health;
    if (updateProjectDto.priority !== undefined) project.priority = updateProjectDto.priority;
    if (updateProjectDto.progress !== undefined) project.progress = updateProjectDto.progress;
    if (updateProjectDto.velocity !== undefined) project.velocity = updateProjectDto.velocity;
    if (updateProjectDto.scopeDelivered !== undefined) project.scopeDelivered = updateProjectDto.scopeDelivered;
    if (updateProjectDto.startDate !== undefined) project.startDate = new Date(updateProjectDto.startDate);
    if (updateProjectDto.endDate !== undefined) project.endDate = new Date(updateProjectDto.endDate);
    if (updateProjectDto.jiraUrl !== undefined) project.jiraUrl = updateProjectDto.jiraUrl;
    if (updateProjectDto.jiraUsername !== undefined) project.jiraUsername = updateProjectDto.jiraUsername;
    if (updateProjectDto.jiraApiToken !== undefined) project.jiraApiToken = updateProjectDto.jiraApiToken;
    if (updateProjectDto.jiraProjectKey !== undefined) project.jiraProjectKey = updateProjectDto.jiraProjectKey;
    if (updateProjectDto.jiraBoardId !== undefined) project.jiraBoardId = updateProjectDto.jiraBoardId;
    if (updateProjectDto.repositoryUrl !== undefined) project.repositoryUrl = updateProjectDto.repositoryUrl;
    if (updateProjectDto.documentationUrl !== undefined) project.documentationUrl = updateProjectDto.documentationUrl;
    if (updateProjectDto.tags !== undefined) project.tags = updateProjectDto.tags;
    if (updateProjectDto.settings !== undefined) project.settings = updateProjectDto.settings;
    if (manager !== undefined) project.manager = manager;

    const updatedProject = await this.projectsRepository.save(project);
    return updatedProject;
  }

  async delete(id: string): Promise<void> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    await this.projectsRepository.remove(project);
  }

  async changeStatus(id: string, status: ProjectStatus): Promise<Project> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    await this.projectsRepository.update(id, { status });
    const updatedProject = await this.findById(id);
    if (!updatedProject) {
      throw new NotFoundException('Erro ao atualizar status do projeto');
    }
    return updatedProject;
  }

  async changeHealth(id: string, health: ProjectHealth): Promise<Project> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    await this.projectsRepository.update(id, { health });
    const updatedProject = await this.findById(id);
    if (!updatedProject) {
      throw new NotFoundException('Erro ao atualizar health do projeto');
    }
    return updatedProject;
  }

  async updateProgress(id: string, progress: number): Promise<Project> {
    if (progress < 0 || progress > 100) {
      throw new BadRequestException('Progresso deve estar entre 0 e 100');
    }

    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    await this.projectsRepository.update(id, { progress });
    const updatedProject = await this.findById(id);
    if (!updatedProject) {
      throw new NotFoundException('Erro ao atualizar progresso do projeto');
    }
    return updatedProject;
  }

  async updateVelocity(id: string, velocity: number): Promise<Project> {
    if (velocity < 0) {
      throw new BadRequestException('Velocity deve ser maior ou igual a 0');
    }

    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    await this.projectsRepository.update(id, { velocity });
    const updatedProject = await this.findById(id);
    if (!updatedProject) {
      throw new NotFoundException('Erro ao atualizar velocity do projeto');
    }
    return updatedProject;
  }

  async updateScopeDelivered(id: string, scopeDelivered: number): Promise<Project> {
    if (scopeDelivered < 0 || scopeDelivered > 100) {
      throw new BadRequestException('Scope delivered deve estar entre 0 e 100');
    }

    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    await this.projectsRepository.update(id, { scopeDelivered });
    const updatedProject = await this.findById(id);
    if (!updatedProject) {
      throw new NotFoundException('Erro ao atualizar scope delivered do projeto');
    }
    return updatedProject;
  }

  async getStats(): Promise<ProjectStatsResponse> {
    const [total, active, completed, paused, cancelled, healthy, warning, critical] = await Promise.all([
      this.projectsRepository.count(),
      this.projectsRepository.count({ where: { status: ProjectStatus.ACTIVE } }),
      this.projectsRepository.count({ where: { status: ProjectStatus.COMPLETED } }),
      this.projectsRepository.count({ where: { status: ProjectStatus.PAUSED } }),
      this.projectsRepository.count({ where: { status: ProjectStatus.CANCELLED } }),
      this.projectsRepository.count({ where: { health: ProjectHealth.HEALTHY } }),
      this.projectsRepository.count({ where: { health: ProjectHealth.WARNING } }),
      this.projectsRepository.count({ where: { health: ProjectHealth.CRITICAL } }),
    ]);

    const [progressResult, velocityResult] = await Promise.all([
      this.projectsRepository
        .createQueryBuilder('project')
        .select('AVG(project.progress)', 'averageProgress')
        .getRawOne(),
      this.projectsRepository
        .createQueryBuilder('project')
        .select('AVG(project.velocity)', 'averageVelocity')
        .getRawOne(),
    ]);

    return {
      total,
      active,
      completed,
      paused,
      cancelled,
      healthy,
      warning,
      critical,
      averageProgress: parseFloat(progressResult?.averageProgress || '0'),
      averageVelocity: parseFloat(velocityResult?.averageVelocity || '0'),
    };
  }

  private mapToProjectResponse(project: Project): ProjectResponse {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      health: project.health,
      priority: project.priority,
      progress: project.progress,
      velocity: project.velocity,
      scopeDelivered: project.scopeDelivered,
      startDate: project.startDate ? (typeof project.startDate === 'string' ? project.startDate : project.startDate.toISOString().split('T')[0]) : undefined,
      endDate: project.endDate ? (typeof project.endDate === 'string' ? project.endDate : project.endDate.toISOString().split('T')[0]) : undefined,
      jiraUrl: project.jiraUrl,
      jiraUsername: project.jiraUsername,
      jiraApiToken: project.jiraApiToken,
      jiraProjectKey: project.jiraProjectKey,
      jiraBoardId: project.jiraBoardId,
      repositoryUrl: project.repositoryUrl,
      documentationUrl: project.documentationUrl,
      tags: project.tags,
      settings: project.settings,
      director: {
        id: project.director.id,
        name: project.director.name,
        email: project.director.email,
      },
      manager: project.manager ? {
        id: project.manager.id,
        name: project.manager.name,
        email: project.manager.email,
      } : undefined,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      lastSyncAt: project.lastSyncAt?.toISOString(),
    };
  }
}
