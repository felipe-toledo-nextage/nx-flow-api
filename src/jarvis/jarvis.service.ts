import { Injectable } from '@nestjs/common';

interface ProcessMessageRequest {
  message: string;
  projectId: string;
  projectContext: any;
  user: any;
}

@Injectable()
export class JarvisService {
  private openaiApiKey = process.env.OPENAI_API_KEY;
  private apiUrl = 'https://api.openai.com/v1/chat/completions';

  async processMessage(request: ProcessMessageRequest): Promise<string> {
    const { message, projectContext, user } = request;

    try {
      // Preparar contexto do projeto para a IA
      const systemPrompt = this.buildSystemPrompt(projectContext, user);
      
      // Se não tiver API key, usar fallback local
      if (!this.openaiApiKey) {
        return this.generateLocalResponse(message, projectContext);
      }

      // Chamar OpenAI
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        console.error('Erro na API OpenAI:', response.status);
        return this.generateLocalResponse(message, projectContext);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || this.generateLocalResponse(message, projectContext);

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      return this.generateLocalResponse(message, projectContext);
    }
  }

  private buildSystemPrompt(projectContext: any, user: any): string {
    const { project, metrics } = projectContext;
    
    return `Você é Jarvis, um assistente inteligente especializado em gestão de projetos e análise de dados do Jira.

CONTEXTO DO PROJETO:
- Nome: ${project.name}
- Descrição: ${project.description || 'Não informada'}
- Status: ${project.status}
- Data de Início: ${project.startDate}
- Data de Entrega: ${project.endDate}
- URL do Jira: ${project.jiraUrl}
- Chave do Projeto: ${project.jiraProjectKey}

MÉTRICAS ATUAIS:
- Progresso: ${metrics.completionRate || 0}%
- Total de Issues: ${metrics.totalIssues || 0}
- Issues Concluídas: ${metrics.completedIssues || 0}
- Issues em Progresso: ${metrics.inProgressIssues || 0}
- Issues Pendentes: ${metrics.todoIssues || 0}
- Velocidade: ${metrics.velocity || 0} issues/sprint
- Taxa de Bugs: ${metrics.bugRate || 0}%
- Tempo Médio de Resolução: ${metrics.avgResolutionTime || 0} dias

USUÁRIO:
- Nome: ${user.name}
- Email: ${user.email}
- Role: ${user.role}

INSTRUÇÕES:
1. Responda de forma clara, concisa e útil
2. Use os dados fornecidos para dar insights específicos e acionáveis
3. Se solicitado, dê conselhos para melhorar a saúde do projeto
4. Analise tendências e identifique problemas ou oportunidades
5. Formate suas respostas de forma limpa, sem tabelas complexas
6. Use emojis para deixar mais amigável
7. Seja proativo em sugerir ações baseadas nos dados
8. Mantenha respostas entre 100-300 palavras

Baseie todas as respostas nos dados reais fornecidos acima.`;
  }

  private generateLocalResponse(message: string, projectContext: any): string {
    const lowerMessage = message.toLowerCase();
    const { project, metrics } = projectContext;
    const completionRate = metrics.completionRate || 0;
    const totalIssues = metrics.totalIssues || 0;
    const completedIssues = metrics.completedIssues || 0;
    const inProgressIssues = metrics.inProgressIssues || 0;
    const todoIssues = metrics.todoIssues || 0;
    const velocity = metrics.velocity || 0;
    const bugRate = metrics.bugRate || 0;
    const avgResolutionTime = metrics.avgResolutionTime || 0;

    // Análise de saúde do projeto
    if (lowerMessage.includes('dica') || lowerMessage.includes('conselho') || lowerMessage.includes('melhor') || lowerMessage.includes('saude')) {
      const suggestions: string[] = [];
      
      if (velocity === 0) suggestions.push('Configure sprints no Jira para medir velocidade da equipe');
      if (completionRate < 50) suggestions.push('Priorize issues críticas para acelerar o progresso');
      if (todoIssues > completedIssues) suggestions.push('Reduza o backlog focando nas issues de maior valor');
      if (avgResolutionTime === 0) suggestions.push('Implemente tracking de tempo para medir eficiência');
      if (inProgressIssues > 10) suggestions.push('Limite issues em progresso para melhorar foco da equipe');
      
      return `💡 Dicas para Melhorar a Saúde do Projeto ${project.name}

Com base na análise dos dados, aqui estão minhas recomendações:

${suggestions.length > 0 ? suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') : 'O projeto está em boa forma! Continue mantendo o bom trabalho.'}

Análise Atual:
• Progresso: ${completionRate}% (${completionRate >= 70 ? 'Excelente!' : completionRate >= 50 ? 'Bom ritmo' : 'Precisa acelerar'})
• Distribuição: ${completedIssues} concluídas, ${inProgressIssues} em progresso, ${todoIssues} pendentes
• Status: ${project.status}

${completionRate >= 70 ? '🎯 Projeto em excelente andamento!' : '⚡ Foque nas issues de alta prioridade para acelerar!'}`;
    }

    // Resposta padrão mais inteligente
    return `📊 Análise do Projeto ${project.name}

${message.includes('status') || message.includes('overview') ? 
  `Situação Atual: O projeto está ${completionRate}% completo com ${totalIssues} issues totais.

Distribuição:
• ${completedIssues} issues concluídas
• ${inProgressIssues} em progresso  
• ${todoIssues} pendentes

${completionRate >= 70 ? 'Projeto em ótimo andamento!' : completionRate >= 50 ? 'Progresso satisfatório.' : 'Precisa de mais atenção.'}` :

  `Entendi sua solicitação sobre "${message}".

Com ${completionRate}% de progresso e ${completedIssues}/${totalIssues} issues concluídas, o projeto ${project.name} está ${completionRate >= 70 ? 'em excelente forma' : 'progredindo bem'}.

Como posso ajudar mais especificamente?`}`;
  }
}