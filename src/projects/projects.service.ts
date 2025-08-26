import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Project, ProjectStatus, ProjectHealth, ProjectPriority } from './entities/project.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
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
      relations: ['director', 'manager', 'clients'],
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

  async findById(id: number): Promise<Project | null> {
    return this.projectsRepository.findOne({ 
      where: { id },
      relations: ['director', 'manager', 'clients'],
    });
  }

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    
    // Verificar se o diretor existe
    const director = await this.usersService.findById(createProjectDto.director);
    if (!director) {
      throw new NotFoundException('Diretor não encontrado');
    }

    // Verificar se o manager existe (se fornecido)
    let manager: User | undefined = undefined;
    if (createProjectDto.manager) {
      const managerUser = await this.usersService.findById(createProjectDto.manager);
      if (!managerUser) {
        throw new NotFoundException('Manager não encontrado');
      }
      manager = managerUser;
    }

    // Criar clientes se fornecidos
    const clientUsers: User[] = [];
    if (createProjectDto.clients && createProjectDto.clients.length > 0) {
      for (const clientData of createProjectDto.clients) {
        // Verificar se o email já existe
        const existingUser = await this.usersService.findByEmail(clientData.email);
        if (existingUser) {
          clientUsers.push(existingUser);
        } else {
          // Criar novo usuário cliente
          const newClient = await this.usersService.create({
            email: clientData.email,
            password: clientData.password,
            name: clientData.email.split('@')[0], // Usar parte do email como nome
            role: UserRole.CLIENT,
            status: UserStatus.ACTIVE
          });
          clientUsers.push(newClient);
        }
      }
    }

    // Criar o projeto com os relacionamentos
    const project = new Project();
    project.name = createProjectDto.name;
    project.description = createProjectDto.description;
    project.status = createProjectDto.status || ProjectStatus.ACTIVE;
    project.health = createProjectDto.health || ProjectHealth.HEALTHY;
    project.priority = createProjectDto.priority || ProjectPriority.MEDIUM;
    project.startDate = createProjectDto.startDate ? new Date(createProjectDto.startDate) : undefined;
    project.endDate = createProjectDto.endDate ? new Date(createProjectDto.endDate) : undefined;
    project.jiraUrl = createProjectDto.jiraUrl;
    project.jiraEmail = createProjectDto.jiraEmail;
    project.jiraApiToken = createProjectDto.jiraApiToken;
    project.jiraProjectKey = createProjectDto.jiraProjectKey;
    project.settings = createProjectDto.settings || {};
    project.director = director;
    project.manager = manager;
    project.clients = clientUsers;

    
    const savedProject = await this.projectsRepository.save(project);
    
    return savedProject;
  }

  async update(id: number, updateProjectDto: UpdateProjectDto): Promise<Project> {
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
    if (updateProjectDto.startDate !== undefined) project.startDate = new Date(updateProjectDto.startDate);
    if (updateProjectDto.endDate !== undefined) project.endDate = new Date(updateProjectDto.endDate);
    if (updateProjectDto.jiraUrl !== undefined) project.jiraUrl = updateProjectDto.jiraUrl;
    if (updateProjectDto.jiraEmail !== undefined) project.jiraEmail = updateProjectDto.jiraEmail;
    if (updateProjectDto.jiraApiToken !== undefined) project.jiraApiToken = updateProjectDto.jiraApiToken;
    if (updateProjectDto.jiraProjectKey !== undefined) project.jiraProjectKey = updateProjectDto.jiraProjectKey;
    if (updateProjectDto.settings !== undefined) project.settings = updateProjectDto.settings;
    if (manager !== undefined) project.manager = manager;

    const updatedProject = await this.projectsRepository.save(project);
    return updatedProject;
  }

  async delete(id: number): Promise<void> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    await this.projectsRepository.remove(project);
  }

  async changeStatus(id: number, status: ProjectStatus): Promise<Project> {
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

  async changeHealth(id: number, health: ProjectHealth): Promise<Project> {
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

    return {
      total,
      active,
      completed,
      paused,
      cancelled,
      healthy,
      warning,
      critical,
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
      startDate: project.startDate ? (typeof project.startDate === 'string' ? project.startDate : project.startDate.toISOString().split('T')[0]) : undefined,
      endDate: project.endDate ? (typeof project.endDate === 'string' ? project.endDate : project.endDate.toISOString().split('T')[0]) : undefined,
      jiraUrl: project.jiraUrl,
      jiraEmail: project.jiraEmail,
      jiraApiToken: project.jiraApiToken,
      jiraProjectKey: project.jiraProjectKey,
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
      clients: project.clients ? project.clients.map(client => ({
        id: client.id,
        name: client.name,
        email: client.email,
      })) : [],
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      lastSyncAt: project.lastSyncAt?.toISOString(),
    };
  }
}
