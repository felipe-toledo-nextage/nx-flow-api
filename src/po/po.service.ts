import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import axios from 'axios';

export interface ScopeAnalysisData {
  projectName: string;
  sprints: Sprint[];
  epics: Epic[];
  userStories: UserStory[];
  jiraConfig?: JiraConfig | null;
}

export interface Sprint {
  name: string;
  objective: string;
  startDate: string;
  endDate: string;
  hoursTotal: number;
  storyPoints: number;
  userStories: string[];
  jiraId?: string;
}

export interface Epic {
  name: string;
  description: string;
  storyPoints: number;
  relatedStories: string[];
  jiraKey?: string;
  jiraId?: string;
}

export interface UserStory {
  id: string;
  title: string;
  description: string;
  storyPoints: number;
  priority: 'High' | 'Medium' | 'Low';
  acceptanceCriteria: string;
  definitionOfDone: string;
  dependencies: string[];
  hours?: number;
  startDate?: string;
  endDate?: string;
  epicLink?: string;
  sprint?: string;
  jiraKey?: string;
  jiraId?: string;
}

export interface JiraConfig {
  url: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

@Injectable()
export class POService {
  private readonly logger = new Logger(POService.name);

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async getUserProjects(directorId: number): Promise<Project[]> {
    return this.projectRepository.find({
      where: { director: { id: directorId } },
      relations: ['director'],
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        jiraUrl: true,
        jiraProjectKey: true,
        createdAt: true,
      },
    });
  }

  async getProjectJiraCredentials(projectId: number): Promise<JiraConfig | null> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['id', 'jiraUrl', 'jiraEmail', 'jiraApiToken', 'jiraProjectKey'],
    });

    if (!project || !project.jiraUrl || !project.jiraEmail || !project.jiraApiToken) {
      return null;
    }

    return {
      url: project.jiraUrl,
      email: project.jiraEmail,
      apiToken: project.jiraApiToken,
      projectKey: project.jiraProjectKey || '',
    };
  }

  parseScopeAnalysis(analysisText: string): ScopeAnalysisData {
    this.logger.debug('Iniciando parse da análise do ScopeAI');
    this.logger.debug(`Tamanho do texto: ${analysisText.length} caracteres`);

    try {
      // Extrair nome do projeto
      const projectNameMatch = analysisText.match(/PROJETO\s*\n([^\n]+)/);
      const projectName = projectNameMatch ? projectNameMatch[1].trim() : 'Projeto Sem Nome';
      this.logger.debug(`Projeto identificado: ${projectName}`);

      // Extrair elementos estruturados
      const epics = this.extractStructuredEpics(analysisText);
      const sprints = this.extractStructuredSprints(analysisText);  
      const userStories = this.extractStructuredStories(analysisText);

      this.logger.debug(`Parse concluído: ${sprints.length} sprints, ${epics.length} épicos, ${userStories.length} stories`);

      return {
        projectName,
        sprints,
        epics,
        userStories,
        jiraConfig: null,
      };
    } catch (error) {
      this.logger.error('Erro ao fazer parse da análise:', error);
      throw new BadRequestException('Erro ao processar análise do ScopeAI');
    }
  }

  private extractStructuredEpics(text: string): Epic[] {
    const epics: Epic[] = [];
    const epicsSection = this.extractSection(text, 'ÉPICOS:');
    
    if (epicsSection) {
      this.logger.debug('Encontrada seção ÉPICOS estruturada');
      
      const lines = epicsSection.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.includes('|')) {
          const parts = line.split('|');
          
          if (parts.length >= 4) {
            const [epicId, name, description, storyPoints] = parts.map(p => p.trim());
            
            epics.push({
              name,
              description,
              storyPoints: parseInt(storyPoints.replace(' pts', '')) || 0,
              relatedStories: [], // Será preenchido baseado nas stories
            });
            
            this.logger.debug(`Épico estruturado processado: ${name}`);
          }
        }
      }
    }
    
    // Fallback para formato tradicional se necessário
    if (epics.length === 0) {
      return this.extractTraditionalEpics(text);
    }
    
    return epics;
  }

  private extractStructuredSprints(text: string): Sprint[] {
    const sprints: Sprint[] = [];
    const sprintsSection = this.extractSection(text, 'SPRINTS:');
    
    if (sprintsSection) {
      this.logger.debug('Encontrada seção SPRINTS estruturada');
      
      const lines = sprintsSection.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.includes('|')) {
          const parts = line.split('|');
          
          if (parts.length >= 7) {
            const [sprintId, name, objective, startDate, endDate, hours, storyPoints] = parts.map(p => p.trim());
            
            sprints.push({
              name,
              objective,
              startDate,
              endDate,
              hoursTotal: parseInt(hours.replace('h', '')) || 0,
              storyPoints: parseInt(storyPoints.replace(' pts', '')) || 0,
              userStories: [], // Será preenchido baseado nas stories
            });
            
            this.logger.debug(`Sprint estruturada processada: ${name}`);
          }
        }
      }
    }
    
    // Fallback para formato tradicional se necessário
    if (sprints.length === 0) {
      return this.extractTraditionalSprints(text);
    }
    
    return sprints;
  }

  private extractStructuredStories(text: string): UserStory[] {
    const userStories: UserStory[] = [];
    const storiesSection = this.extractSection(text, 'STORIES:');
    
    if (storiesSection) {
      this.logger.debug('Encontrada seção STORIES estruturada');
      
      const lines = storiesSection.split('\n').filter(line => line.trim() && !line.startsWith('EXEMPLO'));
      
      for (const line of lines) {
        if (line.includes('|')) {
          const parts = line.split('|');
          
          if (parts.length >= 12) {
            const [id, title, description, acceptanceCriteria, epicLink, sprintLink, hours, storyPoints, priority, startDate, endDate, dependencies] = parts.map(p => p.trim());
            
            // Converter prioridade
            let mappedPriority: 'High' | 'Medium' | 'Low' = 'Medium';
            if (priority.toLowerCase() === 'high') mappedPriority = 'High';
            if (priority.toLowerCase() === 'low') mappedPriority = 'Low';
            
            // Converter dependências
            const deps = dependencies === 'NONE' ? [] : dependencies.split(',').map(d => d.trim());
            
            userStories.push({
              id,
              title,
              description: this.buildStructuredDescription(description, acceptanceCriteria),
              storyPoints: parseInt(storyPoints.replace(' pts', '')) || 5,
              priority: mappedPriority,
              acceptanceCriteria,
              definitionOfDone: 'Código revisado, testado e deployado',
              dependencies: deps,
              hours: parseInt(hours.replace('h', '')) || 0,
              startDate,
              endDate,
              epicLink,
              sprint: sprintLink,
            });
            
            this.logger.debug(`Story estruturada processada: ${id} - ${title}`);
          }
        }
      }
    }
    
    // Fallback para formato tradicional se necessário
    if (userStories.length === 0) {
      this.logger.warn('Formato estruturado não encontrado, usando fallback tradicional');
      return this.extractTraditionalStories(text);
    }
    
    this.logger.debug(`Total de user stories extraídas: ${userStories.length}`);
    return userStories;
  }

  private extractTraditionalEpics(text: string): Epic[] {
    const epics: Epic[] = [];
    const epicMatches = text.match(/\d+\. ([^-]+) - ([^-]+) - (\d+) story points\s*Stories relacionadas: ([^\n]+)/g);

    if (epicMatches) {
      this.logger.debug(`Usando fallback - encontrados ${epicMatches.length} épicos tradicionais`);
      
      epicMatches.forEach((match, index) => {
        const epicDetails = match.match(/\d+\. ([^-]+) - ([^-]+) - (\d+) story points\s*Stories relacionadas: ([^\n]+)/);
        
        if (epicDetails) {
          const [, name, description, points, stories] = epicDetails;
          const relatedStories = stories.split(',').map(s => s.trim());
          
          epics.push({
            name: name.trim(),
            description: description.trim(),
            storyPoints: parseInt(points) || 0,
            relatedStories,
          });
          
          this.logger.debug(`Épico tradicional processado: ${name.trim()}`);
        }
      });
    }

    return epics;
  }

  private extractTraditionalSprints(text: string): Sprint[] {
    const sprints: Sprint[] = [];
    const sprintMatches = text.match(/Sprint \d+ - ([^(]+)\s*\(([^)]+)\)\s*Objetivo da Sprint: ([^\n]+)\s*Horas totais: (\d+)h\s*Story Points estimados: (\d+) pts/g);

    if (sprintMatches) {
      this.logger.debug(`Usando fallback - encontradas ${sprintMatches.length} sprints tradicionais`);
      
      sprintMatches.forEach((match, index) => {
        const sprintDetails = match.match(/Sprint \d+ - ([^(]+)\s*\(([^)]+)\)\s*Objetivo da Sprint: ([^\n]+)\s*Horas totais: (\d+)h\s*Story Points estimados: (\d+) pts/);
        
        if (sprintDetails) {
          const [, name, dateRange, objective, hours, points] = sprintDetails;
          const dates = dateRange.split(' a ');
          
          sprints.push({
            name: name.trim(),
            objective: objective.trim(),
            startDate: dates[0]?.trim() || '',
            endDate: dates[1]?.trim() || '',
            hoursTotal: parseInt(hours) || 0,
            storyPoints: parseInt(points) || 0,
            userStories: [],
          });
          
          this.logger.debug(`Sprint tradicional processada: ${name.trim()}`);
        }
      });
    }

    return sprints;
  }
  
  private extractTraditionalStories(text: string): UserStory[] {
    const userStories: UserStory[] = [];
    
    // Pattern para formato numerado (1 - FPF-001 – ...)
    const numberedPattern = /(\d+) - ([A-Z]+-\d+) – ([^\n]+)[\s\S]*?Estimativa: (\d+)h[\s\S]*?(?:Data início: ([^\n]+))?[\s\S]*?(?:Data fim: ([^\n]+))?/g;
    let match;
    
    while ((match = numberedPattern.exec(text)) !== null) {
      const [, number, id, title, hours, startDate, endDate] = match;
      
      if (!userStories.find(story => story.id === id.trim())) {
        userStories.push({
          id: id.trim(),
          title: title.trim(),
          description: `Story: ${title.trim()}`,
          storyPoints: 5,
          priority: 'Medium',
          acceptanceCriteria: 'A definir conforme análise detalhada',
          definitionOfDone: 'Código revisado, testado e deployado',
          dependencies: [],
          hours: parseInt(hours) || 0,
          startDate: startDate?.trim() || '',
          endDate: endDate?.trim() || '',
        });
        
        this.logger.debug(`Story tradicional processada: ${id} - ${title}`);
      }
    }
    
    return userStories;
  }
  
  private buildStructuredDescription(description: string, acceptanceCriteria: string): string {
    return `📋 DESCRIÇÃO\n${description}\n\n📝 CRITÉRIOS DE ACEITE\n${acceptanceCriteria}`;
  }
  
  private extractSection(text: string, sectionName: string): string | null {
    const regex = new RegExp(`${sectionName}([\\s\\S]*?)(?=\\n[A-Z]+:|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  async createJiraStructure(projectId: number, analysisData: ScopeAnalysisData): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const jiraConfig = await this.getProjectJiraCredentials(projectId);
      
      if (!jiraConfig) {
        return {
          success: false,
          message: 'Credenciais do Jira não encontradas para este projeto',
        };
      }

      this.logger.log(`Iniciando criação da estrutura no Jira para projeto ${projectId}`);

      // Configurar cliente Jira
      const jiraClient = axios.create({
        baseURL: jiraConfig.url,
        headers: {
          'Authorization': `Basic ${Buffer.from(`${jiraConfig.email}:${jiraConfig.apiToken}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      // Obter tipos de issue disponíveis no projeto
      const issueTypesResponse = await jiraClient.get(`/rest/api/3/project/${jiraConfig.projectKey}/statuses`);
      const availableIssueTypes = issueTypesResponse.data.map(item => item.name.toLowerCase());
      
      this.logger.log(`Tipos de issue disponíveis: ${availableIssueTypes.join(', ')}`);

      // 1. Criar épicos
      const createdEpics = await this.createEpics(jiraClient, jiraConfig.projectKey, analysisData.epics, availableIssueTypes);
      
      // 2. Criar sprints
      const createdSprints = await this.createSprints(jiraClient, jiraConfig.projectKey, analysisData.sprints);
      
      // 3. Criar user stories
      const createdStories = await this.createUserStories(jiraClient, jiraConfig.projectKey, analysisData.userStories, createdEpics, createdSprints, availableIssueTypes);

      return {
        success: true,
        message: 'Estrutura criada com sucesso no Jira!',
        data: {
          epics: createdEpics.length,
          sprints: createdSprints.length,
          stories: createdStories.length,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao criar estrutura no Jira:', error);
      return {
        success: false,
        message: `Erro ao integrar com Jira: ${error.message}`,
      };
    }
  }

  private async createEpics(jiraClient: any, projectKey: string, epics: Epic[], availableIssueTypes: string[]): Promise<Epic[]> {
    const createdEpics: Epic[] = [];

    const epicIssueType = availableIssueTypes.find(type => 
      type.includes('epic') || type.includes('épico')
    ) || availableIssueTypes.find(type => 
      type.includes('task') || type.includes('tarefa')
    ) || availableIssueTypes.filter(type => 
      !type.includes('subtask') && !type.includes('sub-task')
    )[0];

    this.logger.log(`Usando tipo de issue '${epicIssueType}' para épicos`);

    for (const epic of epics) {
      try {
        const epicData = {
          fields: {
            project: { key: projectKey },
            summary: epic.name,
            description: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: `📋 ÉPICO\n${epic.description}\n\n📊 STORY POINTS: ${epic.storyPoints}`
                    }
                  ]
                }
              ]
            },
            issuetype: { name: epicIssueType },
          },
        };

        const response = await jiraClient.post('/rest/api/3/issue', epicData);
        createdEpics.push({
          ...epic,
          jiraKey: response.data.key,
          jiraId: response.data.id,
        });

        this.logger.log(`Épico criado: ${response.data.key} - ${epic.name}`);
      } catch (error) {
        this.logger.error(`Erro ao criar épico ${epic.name}:`, error.response?.data || error.message);
      }
    }

    return createdEpics;
  }

  private async createSprints(jiraClient: any, projectKey: string, sprints: Sprint[]): Promise<Sprint[]> {
    const createdSprints: Sprint[] = [];

    try {
      const boardsResponse = await jiraClient.get(`/rest/agile/1.0/board?projectKeyOrId=${projectKey}`);
      const boardId = boardsResponse.data.values[0]?.id;

      if (!boardId) {
        this.logger.warn('Board não encontrado para o projeto');
        return [];
      }

      for (const sprint of sprints) {
        try {
          const startDate = this.convertDateToISO(sprint.startDate);
          const endDate = this.convertDateToISO(sprint.endDate);
          const sprintName = sprint.name.length > 30 ? sprint.name.substring(0, 27) + '...' : sprint.name;
          
          const sprintData = {
            name: sprintName,
            startDate: startDate,
            endDate: endDate,
            goal: sprint.objective,
            originBoardId: boardId,
          };

          const response = await jiraClient.post('/rest/agile/1.0/sprint', sprintData);
          createdSprints.push({
            ...sprint,
            jiraId: response.data.id,
          });

          this.logger.log(`Sprint criada: ${response.data.id} - ${sprint.name}`);
        } catch (error) {
          this.logger.error(`Erro ao criar sprint ${sprint.name}:`, error.response?.data || error.message);
        }
      }
    } catch (error) {
      this.logger.error('Erro ao obter board ID:', error.response?.data || error.message);
    }

    return createdSprints;
  }

  private async createUserStories(jiraClient: any, projectKey: string, userStories: UserStory[], createdEpics: Epic[], createdSprints: Sprint[], availableIssueTypes: string[]): Promise<UserStory[]> {
    const createdStories: UserStory[] = [];

    const storyIssueType = availableIssueTypes.find(type => 
      type.includes('story') || type.includes('história')
    ) || availableIssueTypes.find(type => 
      type.includes('task') || type.includes('tarefa')
    ) || availableIssueTypes.filter(type => 
      !type.includes('subtask') && !type.includes('sub-task')
    )[0];

    let finalStoryIssueType = storyIssueType;
    if (storyIssueType && (storyIssueType.includes('subtask') || storyIssueType.includes('sub-task'))) {
      finalStoryIssueType = availableIssueTypes.find(type => 
        type.includes('task') && !type.includes('subtask') && !type.includes('sub-task')
      ) || 'Task';
      this.logger.log(`Usando tipo de issue '${finalStoryIssueType}' para stories (fallback por subtask)`);
    } else {
      this.logger.log(`Usando tipo de issue '${finalStoryIssueType}' para stories`);
    }

    for (const story of userStories) {
      try {
        let completeDescription = story.description;
        
        if (story.hours && story.hours > 0) {
          completeDescription += `\n\n⏱️ ESTIMATIVA: ${story.hours} horas`;
        }
        
        if (story.startDate) {
          completeDescription += `\n📅 DATA INÍCIO: ${story.startDate}`;
        }
        
        if (story.endDate) {
          completeDescription += `\n📅 DATA FIM: ${story.endDate}`;
        }

        if (story.dependencies && story.dependencies.length > 0) {
          completeDescription += `\n🔗 DEPENDÊNCIAS: ${story.dependencies.join(', ')}`;
        }

        const storyData = {
          fields: {
            project: { key: projectKey },
            summary: story.title,
            description: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: completeDescription
                    }
                  ]
                }
              ]
            },
            issuetype: { name: finalStoryIssueType },
          },
        };

        const response = await jiraClient.post('/rest/api/3/issue', storyData);
        
        const createdStory = {
          ...story,
          jiraKey: response.data.key,
          jiraId: response.data.id,
        };
        
        createdStories.push(createdStory);
        this.logger.log(`Story criada: ${response.data.key} - ${story.title}`);
        
        // Atribuir à sprint correta
        await this.assignStoryToSprint(jiraClient, createdStory, createdSprints);
        
      } catch (error) {
        this.logger.error(`Erro ao criar story ${story.id}:`, error.response?.data || error.message);
      }
    }

    return createdStories;
  }

  private async assignStoryToSprint(jiraClient: any, story: UserStory, createdSprints: Sprint[]): Promise<void> {
    try {
      let targetSprint: Sprint | undefined;
      
      // Método 1: Procurar pela sprint especificada na story
      if (story.sprint) {
        const sprintId = story.sprint.replace('SPRINT-', '');
        const sprintIndex = parseInt(sprintId) - 1;
        targetSprint = createdSprints[sprintIndex];
        
        if (targetSprint) {
          this.logger.debug(`Story ${story.id} atribuída pela referência SPRINT-${sprintId}: ${targetSprint.name}`);
        }
      }
      
      // Método 2: Usar data de início/fim para determinar a sprint correta
      if (!targetSprint && story.startDate) {
        const storyStartDate = this.parseDateString(story.startDate);
        
        targetSprint = createdSprints.find(sprint => {
          const sprintStartDate = this.parseDateString(sprint.startDate);
          const sprintEndDate = this.parseDateString(sprint.endDate);
          
          return storyStartDate >= sprintStartDate && storyStartDate <= sprintEndDate;
        });
        
        if (targetSprint) {
          this.logger.debug(`Story ${story.id} atribuída por data à sprint: ${targetSprint.name}`);
        }
      }
      
      // Método 3: Fallback - primeira sprint disponível
      if (!targetSprint) {
        targetSprint = createdSprints[0];
        this.logger.debug(`Story ${story.id} usando fallback - primeira sprint: ${targetSprint?.name}`);
      }
      
      // Atribuir à sprint no Jira
      if (targetSprint && targetSprint.jiraId) {
        await jiraClient.post(`/rest/agile/1.0/sprint/${targetSprint.jiraId}/issue`, {
          issues: [story.jiraKey]
        });
        
        this.logger.log(`Story ${story.jiraKey} atribuída à sprint ${targetSprint.name}`);
      } else {
        this.logger.error(`Não foi possível atribuir story ${story.id} a nenhuma sprint`);
      }
    } catch (error) {
      this.logger.error(`Erro ao atribuir story ${story.id} à sprint:`, error.response?.data || error.message);
    }
  }
  
  private parseDateString(dateStr: string): Date {
    if (!dateStr) return new Date();
    
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return new Date(dateStr);
  }

  private convertDateToISO(dateStr: string): string {
    const cleanDateStr = dateStr.replace(/^.* - /, '');
    const [day, month, year] = cleanDateStr.split('/');
    
    if (day && month && year) {
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString();
    }
    
    return new Date().toISOString();
  }
}