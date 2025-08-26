import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface JiraConfig {
  url: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  issueType: string;
  storyPoints?: number;
  assignee?: string;
  created: string;
  updated: string;
  resolved?: string;
  sprint?: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  goal?: string;
}

export interface JiraProjectData {
  project: {
    key: string;
    name: string;
  };
  sprints: JiraSprint[];
  issues: JiraIssue[];
  metrics: {
    totalIssues: number;
    completedIssues: number;
    totalStoryPoints: number;
    completedStoryPoints: number;
    averageVelocity: number;
    reworkRate: number;
    throughput: {
      stories: number;
      bugs: number;
      tasks: number;
      epics: number;
    };
  };
}

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);

  constructor(private configService: ConfigService) {}

  private createJiraClient(config: JiraConfig): AxiosInstance {
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    
    return axios.create({
      baseURL: config.url.endsWith('/') ? config.url : `${config.url}/`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async getProjectData(config: JiraConfig): Promise<JiraProjectData> {
    try {
      this.logger.log(`Fetching Jira data for project: ${config.projectKey}`);
      
      const jiraClient = this.createJiraClient(config);
      
      // Buscar informações do projeto
      const projectInfo = await this.getProjectInfo(jiraClient, config.projectKey);
      
      // Buscar sprints
      const sprints = await this.getSprints(jiraClient, config.projectKey);
      
      // Buscar issues
      const issues = await this.getIssues(jiraClient, config.projectKey);
      
      // Calcular métricas
      const metrics = this.calculateMetrics(issues, sprints);
      
      return {
        project: projectInfo,
        sprints,
        issues,
        metrics,
      };
      
    } catch (error) {
      this.logger.error(`Error fetching Jira data: ${error.message}`, error.stack);
      
      if (error.response?.status === 401) {
        throw new BadRequestException('Credenciais do Jira inválidas');
      } else if (error.response?.status === 404) {
        throw new BadRequestException('Projeto não encontrado no Jira');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new BadRequestException('Não foi possível conectar com o Jira. Verifique a URL');
      }
      
      throw new BadRequestException(`Erro ao buscar dados do Jira: ${error.message}`);
    }
  }

  private async getProjectInfo(jiraClient: AxiosInstance, projectKey: string) {
    const response = await jiraClient.get(`rest/api/3/project/${projectKey}`);
    
    return {
      key: response.data.key,
      name: response.data.name,
    };
  }

  private async getSprints(jiraClient: AxiosInstance, projectKey: string): Promise<JiraSprint[]> {
    try {
      // Primeiro, buscar o board do projeto
      const boardsResponse = await jiraClient.get(`rest/agile/1.0/board?projectKeyOrId=${projectKey}`);
      
      if (boardsResponse.data.values.length === 0) {
        this.logger.warn(`No boards found for project ${projectKey}`);
        return [];
      }
      
      const boardId = boardsResponse.data.values[0].id;
      
      // Buscar sprints do board
      const sprintsResponse = await jiraClient.get(`rest/agile/1.0/board/${boardId}/sprint?maxResults=50`);
      
      return sprintsResponse.data.values.map(sprint => ({
        id: sprint.id,
        name: sprint.name,
        state: sprint.state,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        completeDate: sprint.completeDate,
        goal: sprint.goal,
      }));
      
    } catch (error) {
      this.logger.warn(`Could not fetch sprints for project ${projectKey}: ${error.message}`);
      return [];
    }
  }

  private async getIssues(jiraClient: AxiosInstance, projectKey: string): Promise<JiraIssue[]> {
    let startAt = 0;
    const maxResults = 100;
    let allIssues: JiraIssue[] = [];
    let total = 0;

    do {
      const jql = `project = ${projectKey} ORDER BY created DESC`;
      const response = await jiraClient.get(`rest/api/3/search`, {
        params: {
          jql,
          startAt,
          maxResults,
          fields: 'summary,status,issuetype,assignee,created,updated,resolutiondate,customfield_10016,customfield_10020,changelog', // Incluir changelog para análise de transições
          expand: 'changelog',
        },
      });

      const issues = response.data.issues.map(issue => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        issueType: issue.fields.issuetype.name,
        storyPoints: issue.fields.customfield_10016 || 0,
        assignee: issue.fields.assignee?.displayName || null,
        created: issue.fields.created,
        updated: issue.fields.updated,
        resolved: issue.fields.resolutiondate,
        sprint: this.extractSprintName(issue.fields.customfield_10016), // Sprint field pode variar
      }));

      allIssues = [...allIssues, ...issues];
      total = response.data.total;
      startAt += maxResults;
      
    } while (startAt < total && startAt < 1000); // Limitar a 1000 issues para performance

    return allIssues;
  }

  private extractSprintName(sprintField: any): string | null {
    if (!sprintField || !Array.isArray(sprintField)) return null;
    
    try {
      // Sprint field normalmente contém strings como "com.atlassian.greenhopper.service.sprint.Sprint@[...],name=Sprint 1,..."
      const sprintString = sprintField[sprintField.length - 1]; // Pegar o sprint mais recente
      const nameMatch = sprintString.match(/name=([^,]+)/);
      return nameMatch ? nameMatch[1] : null;
    } catch {
      return null;
    }
  }

  private calculateMetrics(issues: JiraIssue[], sprints: JiraSprint[]) {
    const totalIssues = issues.length;
    const completedStatuses = ['Done', 'Closed', 'Resolved', 'Finalizado', 'Concluído'];
    const inProgressStatuses = ['Em Progresso', 'In Progress', 'Development', 'Desenvolvimento'];
    const todoStatuses = ['A fazer', 'To Do', 'Open', 'Aberto', 'Backlog'];

    const completedIssues = issues.filter(issue => 
      completedStatuses.some(status => issue.status.toLowerCase().includes(status.toLowerCase()))
    ).length;

    const inProgressIssues = issues.filter(issue =>
      inProgressStatuses.some(status => issue.status.toLowerCase().includes(status.toLowerCase()))
    ).length;

    const todoIssues = issues.filter(issue =>
      todoStatuses.some(status => issue.status.toLowerCase().includes(status.toLowerCase()))
    ).length;

    const totalStoryPoints = issues.reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);
    const completedStoryPoints = issues
      .filter(issue => completedStatuses.some(status => issue.status.toLowerCase().includes(status.toLowerCase())))
      .reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);

    // Calcular velocity média dos últimos sprints completados
    const completedSprints = sprints.filter(sprint => sprint.state === 'closed');
    const recentSprints = completedSprints.slice(-6); // Últimos 6 sprints
    
    let totalVelocity = 0;
    recentSprints.forEach(sprint => {
      const sprintIssues = issues.filter(issue => issue.sprint === sprint.name);
      const sprintPoints = sprintIssues
        .filter(issue => completedStatuses.some(status => issue.status.toLowerCase().includes(status.toLowerCase())))
        .reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);
      totalVelocity += sprintPoints;
    });
    
    const averageVelocity = recentSprints.length > 0 ? Math.round(totalVelocity / recentSprints.length) : 0;

    // Calcular rework rate baseado em issues que tiveram múltiplas transições para "Done" ou foram reabertos
    // Simulando rework baseado em issues que foram atualizadas muitas vezes após criação
    const now = new Date();
    const reworkIssues = issues.filter(issue => {
      const created = new Date(issue.created);
      const updated = new Date(issue.updated);
      const daysBetween = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      
      // Considera rework se:
      // 1. Issue foi atualizada mais de 7 dias após criação E está em progresso
      // 2. Issue tem mais de 14 dias e ainda não foi resolvida
      // 3. Issue foi resolvida mas está de volta em progresso
      return (
        (daysBetween > 7 && inProgressStatuses.some(status => issue.status.toLowerCase().includes(status.toLowerCase()))) ||
        (daysBetween > 14 && !issue.resolved) ||
        (issue.resolved && inProgressStatuses.some(status => issue.status.toLowerCase().includes(status.toLowerCase())))
      );
    }).length;

    const reworkRate = totalIssues > 0 ? Math.round((reworkIssues / totalIssues) * 100) : 0;

    // Calcular lead time médio (tempo da criação até resolução)
    const resolvedIssues = issues.filter(issue => issue.resolved);
    const totalLeadTime = resolvedIssues.reduce((sum, issue) => {
      const created = new Date(issue.created);
      const resolved = new Date(issue.resolved!); // Usar non-null assertion pois já filtramos
      return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);
    const averageLeadTime = resolvedIssues.length > 0 ? Math.round(totalLeadTime / resolvedIssues.length) : 0;

    // Throughput por tipo com cálculos mais detalhados
    const throughput = {
      stories: issues.filter(issue => ['Story', 'História', 'User Story'].includes(issue.issueType)).length,
      bugs: issues.filter(issue => ['Bug', 'Defeito', 'Error'].includes(issue.issueType)).length,
      tasks: issues.filter(issue => ['Task', 'Tarefa', 'Subtask'].includes(issue.issueType)).length,
      epics: issues.filter(issue => ['Epic', 'Épico'].includes(issue.issueType)).length,
    };

    // Cálculo de produtividade (issues completadas nas últimas 4 semanas)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentCompletedIssues = issues.filter(issue => {
      const resolved = issue.resolved ? new Date(issue.resolved) : null;
      return resolved && resolved >= fourWeeksAgo && completedStatuses.some(status => 
        issue.status.toLowerCase().includes(status.toLowerCase())
      );
    }).length;

    // Calcular distribuição de status para o gráfico
    const statusDistribution = {
      todo: todoIssues,
      inProgress: inProgressIssues,
      completed: completedIssues,
      blocked: issues.filter(issue => 
        ['Blocked', 'Bloqueado', 'Impediment'].some(status => 
          issue.status.toLowerCase().includes(status.toLowerCase())
        )
      ).length
    };

    return {
      totalIssues,
      completedIssues,
      inProgressIssues,
      todoIssues,
      totalStoryPoints,
      completedStoryPoints,
      averageVelocity,
      averageLeadTime,
      reworkRate,
      recentCompletedIssues,
      statusDistribution,
      throughput,
      completionRate: totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0,
    };
  }
}