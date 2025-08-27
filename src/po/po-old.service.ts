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
  hours?: number; // Estimativa em horas
  startDate?: string; // Data de início
  endDate?: string; // Data de fim
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

      // Extrair sprints
      const sprints = this.extractSprints(analysisText);
      this.logger.debug(`Sprints encontradas: ${sprints.length}`);
      
      // Extrair épicos
      const epics = this.extractEpics(analysisText);
      this.logger.debug(`Épicos encontrados: ${epics.length}`);
      
      // Extrair user stories
      const userStories = this.extractUserStories(analysisText);
      this.logger.debug(`User stories encontradas: ${userStories.length}`);

      this.logger.debug(`Parse concluído: ${sprints.length} sprints, ${epics.length} épicos, ${userStories.length} stories`);

      return {
        projectName,
        sprints,
        epics,
        userStories,
        jiraConfig: null, // Será preenchido depois
      };
    } catch (error) {
      this.logger.error('Erro ao fazer parse da análise:', error);
      throw new BadRequestException('Erro ao processar análise do ScopeAI');
    }
  }

  private extractSprints(text: string): Sprint[] {
    const sprints: Sprint[] = [];
    
    // Extrair seção de organização em sprints
    const sprintSectionMatch = text.match(/ORGANIZAÇÃO EM SPRINTS.*?(?=BACKLOG ORGANIZADO|CRONOGRAMA|$)/s);
    
    if (sprintSectionMatch) {
      const sprintSection = sprintSectionMatch[0];
      
      // Pattern para capturar sprints com suas stories
      const sprintBlockPattern = /Sprint (\d+) - ([^(]+)\s*\(([^)]+)\)\s*Objetivo da Sprint: ([^\n]+)\s*Horas totais: (\d+)h\s*Story Points estimados: (\d+) pts[\s\S]*?(?=Sprint \d+|$)/g;
      
      let match;
      while ((match = sprintBlockPattern.exec(sprintSection)) !== null) {
        const [fullMatch, number, name, dateRange, objective, hours, points] = match;
        const dates = dateRange.split(' a ');
        
        // Extrair stories desta sprint
        const storyIds = this.extractStoriesFromSprintBlock(fullMatch);
        
        const sprint = {
          name: name.trim(),
          objective: objective.trim(),
          startDate: dates[0]?.trim() || '',
          endDate: dates[1]?.trim() || '',
          hoursTotal: parseInt(hours) || 0,
          storyPoints: parseInt(points) || 0,
          userStories: storyIds, // IDs das stories que pertencem a esta sprint
        };
        
        sprints.push(sprint);
        this.logger.debug(`Sprint ${number} processada: ${sprint.name} com ${storyIds.length} stories`);
      }
    }
    
    // Fallback para formato simples se não encontrar a seção completa
    if (sprints.length === 0) {
      const sprintMatches = text.match(/Sprint \d+ - ([^(]+)\s*\(([^)]+)\)\s*Objetivo da Sprint: ([^\n]+)\s*Horas totais: (\d+)h\s*Story Points estimados: (\d+) pts/g);

      if (sprintMatches) {
        this.logger.debug(`Usando fallback - encontradas ${sprintMatches.length} sprints`);
        
        sprintMatches.forEach((match, index) => {
          const sprintDetails = match.match(/Sprint \d+ - ([^(]+)\s*\(([^)]+)\)\s*Objetivo da Sprint: ([^\n]+)\s*Horas totais: (\d+)h\s*Story Points estimados: (\d+) pts/);
          
          if (sprintDetails) {
            const [, name, dateRange, objective, hours, points] = sprintDetails;
            const dates = dateRange.split(' a ');
            
            const sprint = {
              name: name.trim(),
              objective: objective.trim(),
              startDate: dates[0]?.trim() || '',
              endDate: dates[1]?.trim() || '',
              hoursTotal: parseInt(hours) || 0,
              storyPoints: parseInt(points) || 0,
              userStories: [], // Será preenchido pela lógica de fallback
            };
            
            sprints.push(sprint);
            this.logger.debug(`Sprint ${index + 1} processada (fallback): ${sprint.name}`);
          }
        });
      } else {
        this.logger.warn('Nenhuma sprint encontrada no formato esperado');
      }
    }

    return sprints;
  }

  private extractStoriesFromSprintBlock(sprintBlock: string): string[] {
    const storyIds: string[] = [];
    
    // Procurar por IDs de stories no bloco da sprint
    const storyMatches = sprintBlock.match(/([A-Z]+-\d+)/g);
    
    if (storyMatches) {
      // Filtrar para pegar apenas os IDs únicos que parecem ser de stories
      const uniqueIds = [...new Set(storyMatches)];
      storyIds.push(...uniqueIds);
    }
    
    return storyIds;
  }

  private extractEpics(text: string): Epic[] {
    const epics: Epic[] = [];
    const epicMatches = text.match(/\d+\. ([^-]+) - ([^-]+) - (\d+) story points\s*Stories relacionadas: ([^\n]+)/g);

    if (epicMatches) {
      this.logger.debug(`Encontrados ${epicMatches.length} épicos`);
      
      epicMatches.forEach((match, index) => {
        const epicDetails = match.match(/\d+\. ([^-]+) - ([^-]+) - (\d+) story points\s*Stories relacionadas: ([^\n]+)/);
        
        if (epicDetails) {
          const [, name, description, points, stories] = epicDetails;
          const relatedStories = stories.split(',').map(s => s.trim());
          
          const epic = {
            name: name.trim(),
            description: description.trim(),
            storyPoints: parseInt(points) || 0,
            relatedStories,
          };
          
          epics.push(epic);
          this.logger.debug(`Épico ${index + 1} processado: ${epic.name}`);
        }
      });
    } else {
      this.logger.warn('Nenhum épico encontrado no formato esperado');
    }

    return epics;
  }

  private extractUserStories(text: string): UserStory[] {
    const userStories: UserStory[] = [];
    
    // Pattern 1: Formato numerado dos requisitos (1 - FPF-001 – ...)
    const numberedPattern = /(\d+) - ([A-Z]+-\d+) – ([^\n]+)\s*Módulo: ([^\n]+)\s*Tipo: ([^\n]+)\s*Descrição: ([^\n]+)[\s\S]*?Critérios de aceite: ([^\n]+)[\s\S]*?(?:O que fazer: ([^\n]*(?:\n(?![\w\s]*:)[^\n]*)*))?\s*Complexidade: ([^\n]+)\s*Estimativa: (\d+)h\s*(?:Data início: ([^\n]+))?\s*(?:Data fim: ([^\n]+))?\s*Dependências: ([^\n]+)/g;
    const numberedMatches = text.match(numberedPattern);

    if (numberedMatches) {
      this.logger.debug(`Encontrados ${numberedMatches.length} requisitos numerados`);
      
      numberedMatches.forEach((match, index) => {
        const storyDetails = match.match(/(\d+) - ([A-Z]+-\d+) – ([^\n]+)\s*Módulo: ([^\n]+)\s*Tipo: ([^\n]+)\s*Descrição: ([^\n]+)[\s\S]*?Critérios de aceite: ([^\n]+)[\s\S]*?(?:O que fazer: ([^\n]*(?:\n(?![\w\s]*:)[^\n]*)*))?\s*Complexidade: ([^\n]+)\s*Estimativa: (\d+)h\s*(?:Data início: ([^\n]+))?\s*(?:Data fim: ([^\n]+))?\s*Dependências: ([^\n]+)/);
        
        if (storyDetails) {
          const [, number, id, title, module, type, description, acceptanceCriteria, whatToDo, complexity, hours, startDate, endDate, dependencies] = storyDetails;
          
          // Mapear complexidade para story points
          const storyPoints = this.mapComplexityToPoints(complexity.trim());
          
          // Mapear complexidade para prioridade
          const priority = this.mapComplexityToPriority(complexity.trim());
          
          userStories.push({
            id: id.trim(),
            title: title.trim(),
            description: this.buildSimpleDescription(
              description.trim(), 
              whatToDo?.trim() || '',
              acceptanceCriteria?.trim() || 'A definir conforme análise detalhada'
            ),
            storyPoints,
            priority,
            acceptanceCriteria: acceptanceCriteria?.trim() || 'A definir conforme análise detalhada',
            definitionOfDone: 'Código revisado, testado e deployado',
            dependencies: dependencies.trim() === '—' ? [] : dependencies.split(',').map(d => d.trim()),
            hours: parseInt(hours) || 0,
            startDate: startDate?.trim() || '',
            endDate: endDate?.trim() || '',
          });
          
          this.logger.debug(`Requisito ${number} processado: ${id} - ${title}`);
        }
      });
    }

    // Pattern 2: Formato tradicional com N (N - FPF-001 – ...)
    const traditionalPattern = /N - ([A-Z]+-\d+) – ([^\n]+)\s*Módulo: ([^\n]+)\s*Tipo: ([^\n]+)\s*Descrição: ([^\n]+)[\s\S]*?Critérios de aceite: ([^\n]+)[\s\S]*?(?:O que fazer: ([^\n]*(?:\n(?![\w\s]*:)[^\n]*)*))?\s*Complexidade: ([^\n]+)\s*Estimativa: (\d+)h\s*(?:Data início: ([^\n]+))?\s*(?:Data fim: ([^\n]+))?\s*Dependências: ([^\n]+)/g;
    const traditionalMatches = text.match(traditionalPattern);

    if (traditionalMatches) {
      this.logger.debug(`Encontrados ${traditionalMatches.length} requisitos tradicionais`);
      
      traditionalMatches.forEach(match => {
        const storyDetails = match.match(/N - ([A-Z]+-\d+) – ([^\n]+)\s*Módulo: ([^\n]+)\s*Tipo: ([^\n]+)\s*Descrição: ([^\n]+)[\s\S]*?Critérios de aceite: ([^\n]+)[\s\S]*?(?:O que fazer: ([^\n]*(?:\n(?![\w\s]*:)[^\n]*)*))?\s*Complexidade: ([^\n]+)\s*Estimativa: (\d+)h\s*(?:Data início: ([^\n]+))?\s*(?:Data fim: ([^\n]+))?\s*Dependências: ([^\n]+)/);
        
        if (storyDetails) {
          const [, id, title, module, type, description, acceptanceCriteria, whatToDo, complexity, hours, startDate, endDate, dependencies] = storyDetails;
          
          // Verificar se já existe (evitar duplicatas)
          if (!userStories.find(story => story.id === id.trim())) {
            // Mapear complexidade para story points
            const storyPoints = this.mapComplexityToPoints(complexity.trim());
            
            // Mapear complexidade para prioridade
            const priority = this.mapComplexityToPriority(complexity.trim());
            
            userStories.push({
              id: id.trim(),
              title: title.trim(),
              description: this.buildSimpleDescription(
                description.trim(), 
                whatToDo?.trim() || '',
                acceptanceCriteria?.trim() || 'A definir conforme análise detalhada'
              ),
              storyPoints,
              priority,
              acceptanceCriteria: acceptanceCriteria?.trim() || 'A definir conforme análise detalhada',
              definitionOfDone: 'Código revisado, testado e deployado',
              dependencies: dependencies.trim() === '—' ? [] : dependencies.split(',').map(d => d.trim()),
              hours: parseInt(hours) || 0,
              startDate: startDate?.trim() || '',
              endDate: endDate?.trim() || '',
            });
          }
        }
      });
    }

    // Pattern 2: Formato simplificado para documentos (qualquer código: ABC-123, XYZ-001, etc.)
    const simplePattern = /•\s*([A-Z]+[-]?\d+)\s*[-–]\s*([^\|]+)(?:\s*\|\s*(\d+)h)?(?:\s*\|\s*(\d+)\s*pts)?(?:\s*\|\s*Priority:\s*(Alta|Média|Baixa|High|Medium|Low))?/gi;
    const simpleMatches = text.match(simplePattern);

    if (simpleMatches) {
      this.logger.debug(`Encontradas ${simpleMatches.length} stories no formato simplificado`);
      
      simpleMatches.forEach(match => {
        const storyDetails = match.match(/•\s*([A-Z]+[-]?\d+)\s*[-–]\s*([^\|]+)(?:\s*\|\s*(\d+)h)?(?:\s*\|\s*(\d+)\s*pts)?(?:\s*\|\s*Priority:\s*(Alta|Média|Baixa|High|Medium|Low))?/i);
        
        if (storyDetails) {
          const [, id, title, hours, points, priority] = storyDetails;
          
          // Usar story points fornecidos ou calcular baseado em horas
          let storyPoints = 5; // Default
          if (points) {
            storyPoints = parseInt(points);
          } else if (hours) {
            const hourValue = parseInt(hours);
            storyPoints = hourValue <= 4 ? 3 : hourValue <= 8 ? 5 : hourValue <= 16 ? 8 : 13;
          }
          
          // Mapear prioridade
          let mappedPriority: 'High' | 'Medium' | 'Low' = 'Medium';
          if (priority) {
            const lowerPriority = priority.toLowerCase();
            if (lowerPriority.includes('alta') || lowerPriority.includes('high')) {
              mappedPriority = 'High';
            } else if (lowerPriority.includes('baixa') || lowerPriority.includes('low')) {
              mappedPriority = 'Low';
            }
          }
          
          userStories.push({
            id: id.trim(),
            title: title.trim(),
            description: `Story: ${title.trim()}`,
            storyPoints,
            priority: mappedPriority,
            acceptanceCriteria: 'A definir conforme análise detalhada',
            definitionOfDone: 'Código revisado, testado e deployado',
            dependencies: [],
          });
        }
      });
    }

    // Pattern 3: Formato Jira estruturado (Como [usuário]...) com horas e datas
    const jiraPattern = /•\s*Story:\s*Como\s+([^,]+),\s*quero\s+([^,]+),\s*para\s+([^\n]+)[\s\S]*?ID:\s*([A-Z]+[-]?\d+)[\s\S]*?(?:O que fazer:\s*([^\n]*(?:\n(?!\s*-)[^\n]*)*))?[\s\S]*?(?:Estimativa:\s*(\d+)h)?[\s\S]*?(?:Data início:\s*([^\n]+))?[\s\S]*?(?:Data fim:\s*([^\n]+))?[\s\S]*?(?:Acceptance Criteria:\s*([^\n]*(?:\n(?!\s*-)[^\n]*)*))?[\s\S]*?Story Points:\s*(\d+)[\s\S]*?Priority:\s*(High|Medium|Low|Alta|Média|Baixa)/gi;
    const jiraMatches = text.match(jiraPattern);

    if (jiraMatches) {
      this.logger.debug(`Encontradas ${jiraMatches.length} stories no formato Jira`);
      
      jiraMatches.forEach(match => {
        const storyDetails = match.match(/•\s*Story:\s*Como\s+([^,]+),\s*quero\s+([^,]+),\s*para\s+([^\n]+)[\s\S]*?ID:\s*([A-Z]+[-]?\d+)[\s\S]*?(?:O que fazer:\s*([^\n]*(?:\n(?!\s*-)[^\n]*)*))?[\s\S]*?(?:Estimativa:\s*(\d+)h)?[\s\S]*?(?:Data início:\s*([^\n]+))?[\s\S]*?(?:Data fim:\s*([^\n]+))?[\s\S]*?(?:Acceptance Criteria:\s*([^\n]*(?:\n(?!\s*-)[^\n]*)*))?[\s\S]*?Story Points:\s*(\d+)[\s\S]*?Priority:\s*(High|Medium|Low|Alta|Média|Baixa)/i);
        
        if (storyDetails) {
          const [, user, want, benefit, id, whatToDo, hours, startDate, endDate, acceptanceCriteria, points, priority] = storyDetails;
          
          // Mapear prioridade
          let mappedPriority: 'High' | 'Medium' | 'Low' = 'Medium';
          const lowerPriority = priority.toLowerCase();
          if (lowerPriority.includes('high') || lowerPriority.includes('alta')) {
            mappedPriority = 'High';
          } else if (lowerPriority.includes('low') || lowerPriority.includes('baixa')) {
            mappedPriority = 'Low';
          }
          
          const baseDescription = `Como ${user.trim()}, quero ${want.trim()}, para ${benefit.trim()}`;
          
          userStories.push({
            id: id.trim(),
            title: `Como ${user.trim()}, quero ${want.trim()}`,
            description: this.buildSimpleDescription(
              baseDescription,
              whatToDo?.trim() || '',
              acceptanceCriteria?.trim() || 'A definir conforme análise detalhada'
            ),
            storyPoints: parseInt(points) || 5,
            priority: mappedPriority,
            acceptanceCriteria: acceptanceCriteria?.trim() || 'A definir conforme análise detalhada',
            definitionOfDone: 'Código revisado, testado e deployado',
            dependencies: [],
            hours: parseInt(hours) || 0,
            startDate: startDate?.trim() || '',
            endDate: endDate?.trim() || '',
          });
        }
      });
    }

    // Pattern 4: Formato mais genérico com códigos variados
    const genericPattern = /(?:^|\n)\s*(?:[-*•]?\s*)?([A-Z]{2,6}[-_]?\d{1,4})\s*[-–:]\s*([^\n\|]+)(?:\s*\|\s*([^\n]+))?/gim;
    const genericMatches = text.match(genericPattern);

    if (genericMatches && userStories.length === 0) { // Só usar se não encontrou nada nos outros padrões
      this.logger.debug(`Encontradas ${genericMatches.length} stories no formato genérico`);
      
      genericMatches.forEach(match => {
        const storyDetails = match.match(/(?:^|\n)\s*(?:[-*•]?\s*)?([A-Z]{2,6}[-_]?\d{1,4})\s*[-–:]\s*([^\n\|]+)(?:\s*\|\s*([^\n]+))?/i);
        
        if (storyDetails) {
          const [, id, title, extra] = storyDetails;
          
          // Verificar se já existe (evitar duplicatas)
          if (!userStories.find(story => story.id === id.trim())) {
            // Extrair informações extras se existir
            let storyPoints = 5; // Default
            let priority: 'High' | 'Medium' | 'Low' = 'Medium';
            
            if (extra) {
              const hoursMatch = extra.match(/(\d+)h/i);
              const pointsMatch = extra.match(/(\d+)\s*pts?/i);
              const priorityMatch = extra.match(/(alta|média|baixa|high|medium|low)/i);
              
              if (pointsMatch) {
                storyPoints = parseInt(pointsMatch[1]);
              } else if (hoursMatch) {
                const hours = parseInt(hoursMatch[1]);
                storyPoints = hours <= 4 ? 3 : hours <= 8 ? 5 : hours <= 16 ? 8 : 13;
              }
              
              if (priorityMatch) {
                const prio = priorityMatch[1].toLowerCase();
                if (prio.includes('alta') || prio.includes('high')) {
                  priority = 'High';
                } else if (prio.includes('baixa') || prio.includes('low')) {
                  priority = 'Low';
                }
              }
            }
            
            userStories.push({
              id: id.trim(),
              title: title.trim(),
              description: `Story: ${title.trim()}`,
              storyPoints,
              priority,
              acceptanceCriteria: 'A definir conforme análise detalhada',
              definitionOfDone: 'Código revisado, testado e deployado',
              dependencies: [],
            });
          }
        }
      });
    }

    // Pattern 5: Fallback para qualquer linha que comece com código de projeto
    if (userStories.length === 0) {
      const fallbackPattern = /(?:^|\n)\s*([A-Z]{2,6}[-_]?\d{1,4})(?:\s*[-–:\.]\s*)?([^\n]+)/gim;
      const fallbackMatches = text.match(fallbackPattern);
      
      if (fallbackMatches) {
        this.logger.debug(`Usando fallback - encontradas ${fallbackMatches.length} possíveis stories`);
        
        fallbackMatches.forEach(match => {
          const storyDetails = match.match(/(?:^|\n)\s*([A-Z]{2,6}[-_]?\d{1,4})(?:\s*[-–:\.]\s*)?([^\n]+)/i);
          
          if (storyDetails) {
            const [, id, title] = storyDetails;
            
            // Filtrar linhas que não parecem ser stories (muito curtas ou sem sentido)
            if (title.trim().length > 10 && !title.match(/^\d+$/) && !title.match(/^(sprint|epic|projeto)/i)) {
              userStories.push({
                id: id.trim(),
                title: title.trim(),
                description: `Story: ${title.trim()}`,
                storyPoints: 5,
                priority: 'Medium' as 'Medium',
                acceptanceCriteria: 'A definir conforme análise detalhada',
                definitionOfDone: 'Código revisado, testado e deployado',
                dependencies: [],
              });
            }
          }
        });
      }
    }

    this.logger.debug(`Total de user stories extraídas: ${userStories.length}`);
    return userStories;
  }

  private mapComplexityToPoints(complexity: string): number {
    const complexityMap = {
      'Baixa': 3,
      'Média': 5,
      'Alta': 8,
      'Muito Alta': 13,
    };
    return complexityMap[complexity] || 5;
  }

  private mapComplexityToPriority(complexity: string): 'High' | 'Medium' | 'Low' {
    if (complexity === 'Muito Alta' || complexity === 'Alta') return 'High';
    if (complexity === 'Média') return 'Medium';
    return 'Low';
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

    // Determinar o tipo de issue para épicos - evitar subtask
    const epicIssueType = availableIssueTypes.find(type => 
      type.includes('epic') || type.includes('épico')
    ) || availableIssueTypes.find(type => 
      type.includes('task') || type.includes('tarefa')
    ) || availableIssueTypes.find(type => 
      type.includes('feature') || type.includes('bug')
    ) || availableIssueTypes.filter(type => 
      !type.includes('subtask') && !type.includes('sub-task')
    )[0]; // Evitar subtask que precisa de parent

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
                      text: `Épico: ${epic.name}\n\nDescrição: ${epic.description}\n\nStory Points: ${epic.storyPoints}\n\nStories relacionadas: ${epic.relatedStories.join(', ')}`
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

    // Primeiro, obter o board ID
    try {
      const boardsResponse = await jiraClient.get(`/rest/agile/1.0/board?projectKeyOrId=${projectKey}`);
      const boardId = boardsResponse.data.values[0]?.id;

      if (!boardId) {
        this.logger.warn('Board não encontrado para o projeto');
        return [];
      }

      for (const sprint of sprints) {
        try {
          // Converter datas para formato ISO
          const startDate = this.convertDateToISO(sprint.startDate);
          const endDate = this.convertDateToISO(sprint.endDate);

          // Truncar nome do sprint se for muito longo (limite de 30 caracteres)
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

    // Determinar o tipo de issue para stories - evitar subtask
    const storyIssueType = availableIssueTypes.find(type => 
      type.includes('story') || type.includes('história')
    ) || availableIssueTypes.find(type => 
      type.includes('task') || type.includes('tarefa')
    ) || availableIssueTypes.find(type => 
      type.includes('bug') || type.includes('feature')
    ) || availableIssueTypes.filter(type => 
      !type.includes('subtask') && !type.includes('sub-task')
    )[0]; // Evitar subtask que precisa de parent

    // Verificação final para garantir que não é subtask
    let finalStoryIssueType = storyIssueType;
    if (storyIssueType && (storyIssueType.includes('subtask') || storyIssueType.includes('sub-task'))) {
      this.logger.warn('Tipo subtask detectado, usando fallback');
      // Buscar 'task' que NÃO seja subtask
      finalStoryIssueType = availableIssueTypes.find(type => 
        type.includes('task') && !type.includes('subtask') && !type.includes('sub-task')
      ) || availableIssueTypes.find(type => 
        type.includes('feature')
      ) || availableIssueTypes.find(type => 
        type.includes('bug')
      ) || 'Task'; // Fallback absoluto
      
      this.logger.log(`Usando tipo de issue '${finalStoryIssueType}' para stories (fallback por subtask)`);
    } else {
      this.logger.log(`Usando tipo de issue '${finalStoryIssueType}' para stories (evitando subtask)`);
    }
    
    // Log para debug
    this.logger.debug(`Tipos disponíveis: ${availableIssueTypes.join(', ')}`);
    this.logger.debug(`Stories: '${finalStoryIssueType || 'UNDEFINED'}'`);

    for (const story of userStories) {
      try {
        // Encontrar épico relacionado
        const relatedEpic = createdEpics.find(epic => 
          epic.relatedStories.includes(story.id)
        );

        // Criar descrição completa com informações de horas e datas
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
            // Adicionar relacionamento com épico se possível (somente para alguns tipos)
            // Não usar para subtask pois precisa de configuração especial
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
        
        // Sempre tentar atribuir story à sprint baseado no ID
        await this.assignStoryToSprint(jiraClient, createdStory, createdSprints, userStories);
        
      } catch (error) {
        this.logger.error(`Erro ao criar story ${story.id}:`, error.response?.data || error.message);
      }
    }

    return createdStories;
  }

  private async assignStoryToSprint(jiraClient: any, story: UserStory, createdSprints: Sprint[], allUserStories: UserStory[]): Promise<void> {
    try {
      let targetSprint: Sprint | undefined;
      
      // Método 1: Procurar pela sprint que contém essa story ID na sua lista
      targetSprint = createdSprints.find(sprint => 
        sprint.userStories.includes(story.id)
      );
      
      if (targetSprint) {
        this.logger.debug(`Story ${story.id} encontrada na sprint: ${targetSprint.name}`);
      } else {
        // Método 2: Usar data de início/fim para determinar a sprint correta
        if (story.startDate) {
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
      }
      
      // Método 3: Fallback - distribuição proporcional
      if (!targetSprint) {
        const storyIndex = allUserStories.findIndex(s => s.id === story.id);
        const storiesPerSprint = Math.ceil(allUserStories.length / createdSprints.length);
        const targetSprintIndex = Math.floor(storyIndex / storiesPerSprint);
        const sprintIndex = Math.min(targetSprintIndex, createdSprints.length - 1);
        
        targetSprint = createdSprints[sprintIndex];
        this.logger.debug(`Story ${story.id} (index ${storyIndex}) atribuída por distribuição à sprint ${sprintIndex}: ${targetSprint?.name}`);
      }
      
      // Método 4: Fallback absoluto - primeira sprint
      if (!targetSprint) {
        targetSprint = createdSprints[0];
        this.logger.warn(`Story ${story.id} usando fallback absoluto - primeira sprint: ${targetSprint?.name}`);
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
    
    // Tentar formato DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Fallback para parsing padrão
    return new Date(dateStr);
  }

  private buildSimpleDescription(
    baseDescription: string,
    whatToDo: string,
    acceptanceCriteria: string
  ): string {
    let description = `📋 DESCRIÇÃO\n`;
    description += `${baseDescription}\n\n`;
    
    if (whatToDo && whatToDo.trim().length > 0) {
      description += `🎯 O QUE FAZER\n`;
      description += `${whatToDo}\n\n`;
    }
    
    description += `📝 CRITÉRIOS DE ACEITE\n`;
    description += `${acceptanceCriteria}\n`;
    
    return description;
  }

  private convertDateToISO(dateStr: string): string {
    // Remover informações extras como "3 semanas - " e converter data DD/MM/YYYY para ISO
    const cleanDateStr = dateStr.replace(/^.* - /, ''); // Remove "3 semanas - "
    const [day, month, year] = cleanDateStr.split('/');
    
    if (day && month && year) {
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString();
    }
    
    // Fallback para data atual se não conseguir converter
    return new Date().toISOString();
  }
}