import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { POService } from './po.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

export interface ProcessAnalysisDto {
  analysisText: string;
  projectId: number;
}

@Controller('po')
@UseGuards(JwtAuthGuard)
export class POController {
  constructor(private readonly poService: POService) {}

  @Get('projects')
  async getUserProjects(@CurrentUser() user: any) {
    return this.poService.getUserProjects(user.id);
  }

  @Post('process-analysis')
  async processAnalysis(@Body() dto: ProcessAnalysisDto) {
    // Parse da análise do ScopeAI
    const analysisData = this.poService.parseScopeAnalysis(dto.analysisText);
    
    // Criar estrutura no Jira
    const result = await this.poService.createJiraStructure(dto.projectId, analysisData);
    
    return result;
  }

  @Get('projects/:projectId/jira-status')
  async checkJiraCredentials(@Param('projectId') projectId: number) {
    const jiraConfig = await this.poService.getProjectJiraCredentials(projectId);
    
    return {
      hasCredentials: !!jiraConfig,
      projectKey: jiraConfig?.projectKey || null,
    };
  }
}