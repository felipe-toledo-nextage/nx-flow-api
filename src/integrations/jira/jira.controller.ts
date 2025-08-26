import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
  ForbiddenException,
  Request,
  Query,
} from '@nestjs/common';
import { JiraService } from './jira.service';
import { ProjectsService } from '../../projects/projects.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectResponse } from '../../projects/interfaces/project-response.interface';

@Controller('jira')
@UseGuards(JwtAuthGuard)
export class JiraController {
  constructor(
    private readonly jiraService: JiraService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Get('projects')
  async getUserProjects(@Request() req) {
    const userId = req.user.id; // Usar id do user ao invés de sub
    const userRole = req.user.role;

    // Buscar projetos baseado na role
    let projects: ProjectResponse[] = [];

    if (userRole === 'admin') {
      // Admin vê todos os projetos
      const response = await this.projectsService.findAll({});
      projects = response.projects;
    } else if (userRole === 'director') {
      // Diretor vê apenas projetos que ele criou
      const response = await this.projectsService.findAll({});
      projects = response.projects.filter(project => 
        project.director.id === userId
      );
    } else if (userRole === 'manager' || userRole === 'user') {
      // Manager e user veem todos os projetos (para fins de trabalho)
      const response = await this.projectsService.findAll({});
      projects = response.projects;
    } else if (userRole === 'client') {
      // Cliente vê apenas projetos vinculados a ele
      const response = await this.projectsService.findAll({});
      projects = response.projects.filter(project => 
        project.clients?.some(client => client.id === userId)
      );
    }

    return {
      success: true,
      data: projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        hasJiraConfig: !!(project.jiraUrl && project.jiraEmail && project.jiraProjectKey && project.jiraApiToken),
        jiraProjectKey: project.jiraProjectKey,
      }))
    };
  }

  @Get('dashboard')
  async getDashboardData(@Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'client') {
      // Cliente: buscar dados automaticamente
      const response = await this.projectsService.findAll({});
      const clientProjects = response.projects.filter(project => 
        project.clients?.some(client => client.id === userId)
      );

      if (clientProjects.length === 0) {
        throw new NotFoundException('Nenhum projeto encontrado para este cliente');
      }

      const targetProject = clientProjects[0];

      // Verificar configuração do Jira
      if (!targetProject.jiraUrl || !targetProject.jiraEmail || !targetProject.jiraProjectKey || !targetProject.jiraApiToken) {
        return {
          success: false,
          error: 'Projeto não possui configurações completas do Jira',
          project: {
            id: targetProject.id,
            name: targetProject.name,
            description: targetProject.description,
          }
        };
      }

      // Buscar dados do Jira
      const jiraConfig = {
        url: targetProject.jiraUrl,
        email: targetProject.jiraEmail,
        apiToken: targetProject.jiraApiToken,
        projectKey: targetProject.jiraProjectKey,
      };

      const jiraData = await this.jiraService.getProjectData(jiraConfig);

      return {
        success: true,
        userType: 'client',
        data: jiraData,
        project: {
          id: targetProject.id,
          name: targetProject.name,
          description: targetProject.description,
        },
      };
    }

    // Para admin/director/manager - retornar lista de projetos disponíveis
    let availableProjects: ProjectResponse[] = [];

    if (userRole === 'admin') {
      const response = await this.projectsService.findAll({});
      availableProjects = response.projects;
    } else if (userRole === 'director') {
      const response = await this.projectsService.findAll({});
      availableProjects = response.projects.filter(project => 
        project.director.id === userId
      );
    } else if (userRole === 'manager' || userRole === 'user') {
      const response = await this.projectsService.findAll({});
      availableProjects = response.projects;
    }

    return {
      success: true,
      userType: userRole,
      requiresProjectSelection: true,
      availableProjects: availableProjects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        hasJiraConfig: !!(project.jiraUrl && project.jiraEmail && project.jiraProjectKey && project.jiraApiToken),
        jiraProjectKey: project.jiraProjectKey,
      }))
    };
  }

  @Get('dashboard/search-projects')
  async searchProjects(@Request() req, @Query('q') query: string = '') {
    const userId = req.user.id;
    const userRole = req.user.role;

    let availableProjects: ProjectResponse[] = [];

    if (userRole === 'admin') {
      const response = await this.projectsService.findAll({});
      availableProjects = response.projects;
    } else if (userRole === 'director') {
      const response = await this.projectsService.findAll({});
      availableProjects = response.projects.filter(project => 
        project.director.id === userId
      );
    } else if (userRole === 'manager' || userRole === 'user') {
      const response = await this.projectsService.findAll({});
      availableProjects = response.projects;
    } else {
      return { success: false, error: 'Clientes não podem buscar projetos' };
    }

    // Filtrar projetos baseado na query de busca
    const filteredProjects = availableProjects.filter(project => 
      query === '' || 
      project.name.toLowerCase().includes(query.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(query.toLowerCase())) ||
      (project.jiraProjectKey && project.jiraProjectKey.toLowerCase().includes(query.toLowerCase()))
    );

    return {
      success: true,
      data: filteredProjects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        hasJiraConfig: !!(project.jiraUrl && project.jiraEmail && project.jiraProjectKey && project.jiraApiToken),
        jiraProjectKey: project.jiraProjectKey,
      }))
    };
  }

  @Get('dashboard/project/:projectId')
  async getDashboardDataForProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Request() req,
  ) {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Buscar o projeto
    const project = await this.projectsService.findById(projectId);
    
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    // Verificar permissões
    const hasAccess = this.checkProjectAccess(project, userId, userRole);
    if (!hasAccess) {
      throw new ForbiddenException('Acesso negado a este projeto');
    }

    // Verificar se o projeto tem configurações do Jira
    if (!project.jiraUrl || !project.jiraEmail || !project.jiraProjectKey || !project.jiraApiToken) {
      return {
        success: false,
        error: 'Projeto não possui configurações completas do Jira',
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
        }
      };
    }

    // Buscar dados do Jira
    const jiraConfig = {
      url: project.jiraUrl,
      email: project.jiraEmail,
      apiToken: project.jiraApiToken,
      projectKey: project.jiraProjectKey,
    };

    const jiraData = await this.jiraService.getProjectData(jiraConfig);

    return {
      success: true,
      data: jiraData,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
      },
    };
  }

  @Get('project/:projectId/data')
  async getProjectJiraData(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Request() req,
  ) {
    const userId = req.user.id; // Usar id do user ao invés de sub
    const userRole = req.user.role;

    // Buscar o projeto
    const project = await this.projectsService.findById(projectId);
    
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    // Verificar permissões
    const hasAccess = this.checkProjectAccess(project, userId, userRole);
    if (!hasAccess) {
      throw new ForbiddenException('Acesso negado a este projeto');
    }

    // Verificar se o projeto tem configurações do Jira
    if (!project.jiraUrl || !project.jiraEmail || !project.jiraProjectKey || !project.jiraApiToken) {
      throw new NotFoundException('Projeto não possui configurações completas do Jira');
    }

    // Buscar dados do Jira
    const jiraConfig = {
      url: project.jiraUrl,
      email: project.jiraEmail,
      apiToken: project.jiraApiToken,
      projectKey: project.jiraProjectKey,
    };

    const jiraData = await this.jiraService.getProjectData(jiraConfig);

    return {
      success: true,
      data: jiraData,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
      },
    };
  }

  private checkProjectAccess(project: any, userId: number, userRole: string): boolean {
    // Admins e managers podem acessar qualquer projeto
    if (userRole === 'admin' || userRole === 'manager') {
      return true;
    }

    // Diretor do projeto pode acessar
    if (project.director?.id === userId) {
      return true;
    }

    // Manager do projeto pode acessar
    if (project.manager?.id === userId) {
      return true;
    }

    // Clientes só podem acessar projetos onde estão vinculados
    if (userRole === 'client') {
      return project.clients?.some(client => client.id === userId) || false;
    }

    // Users podem acessar (assumindo que são da equipe)
    if (userRole === 'user') {
      return true;
    }

    return false;
  }
}