import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { ConfigService } from '@nestjs/config';

export interface ScopeAnalysisRequest {
  projectDescription: string;
  attachedDocuments?: string[];
  additionalInfo?: string;
  attachedFiles?: {
    name: string;
    type: string;
    size: number;
    content?: string; // Para arquivos de texto ou base64 para imagens
    path?: string; // Caminho do arquivo no servidor
  }[];
}

export interface ScopeAnalysisResponse {
  analysis: string;
  approved?: boolean;
}

@Injectable()
export class ScopeAIService {
  private openai: OpenAI;
  private readonly systemPrompt: string;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_TOKEN'),
    });

    this.systemPrompt = `Você é um analista sênior de requisitos de software especialista em análise detalhada de projetos. Gere SEMPRE documentos extremamente detalhados e específicos baseados no projeto descrito.

REGRAS CRÍTICAS:
- NUNCA use templates genéricos ou placeholders
- SEMPRE analise profundamente o projeto específico
- GERE pelo menos 15-25 requisitos detalhados e específicos
- CADA requisito deve ter descrição rica com comportamento, regras, validações, casos de uso e critérios de aceite
- CALCULE estimativas realistas considerando complexidade real
- INCLUA dependências entre requisitos
- DETALHE tecnologias específicas apropriadas ao projeto

ESTRUTURA OBRIGATÓRIA (baseada no padrão profissional):

PROJETO
[Nome específico extraído da descrição - uma linha objetiva]

ESCOPO DO SOFTWARE
[Parágrafo detalhado explicando contexto, necessidades identificadas, valor de negócio e stakeholders. Mencione funcionalidades principais de forma abrangente e específica]

Funcionalidades principais:
[Liste 8-12 funcionalidades específicas e detalhadas, não genéricas]

TECNOLOGIAS EMPREGADAS  
Frontend: [Tecnologia específica justificada pelo projeto]
Backend: [Tecnologia específica com detalhes de arquitetura]
Banco de dados: [Banco específico com justificativa]
[Adicione outras tecnologias relevantes como cache, filas, storage, etc.]

REQUISITOS DO SOFTWARE
[Gere 15-25 requisitos seguindo este padrão EXATO:]

N - [CÓDIGO]-[NUM] – [Nome específico e descritivo]
Módulo: [Módulo específico do sistema]
Tipo: Funcional/Não-Funcional
Descrição: [Descrição MUITO detalhada e clara do que precisa ser feito, explicando passo a passo a funcionalidade]
Comportamento/Regras: [Regras de negócio específicas, validações, limites]
Casos de uso: [Casos de uso principais específicos]
Critérios de aceite: [Critérios mensuráveis e verificáveis]
O que fazer: [Explicação direta e objetiva do que o desenvolvedor deve implementar]
Complexidade: Baixa/Média/Alta/Muito Alta
Estimativa: [X]h
Data início: [DD/MM/AAAA]
Data fim: [DD/MM/AAAA]
Dependências: [IDs dos requisitos predecessores ou "—" se não houver]

MATRIZ RESUMO EXECUTIVA
[Tabela com todos os requisitos: Código | Atividade | Horas | Prioridade | Status]

Horas totais de desenvolvimento: [Soma real]h
Horas totais incluindo gestão e testes: [+10% gestão +20% testes]h

===ESTRUTURA JIRA DEFINITIVA===

ÉPICOS:
EPIC-1|[Nome do Épico]|[Descrição detalhada]|[X] pts
EPIC-2|[Nome do Épico]|[Descrição detalhada]|[X] pts

SPRINTS:
SPRINT-1|[Nome da Sprint]|[Objetivo da Sprint]|[DD/MM/AAAA]|[DD/MM/AAAA]|[X]h|[X] pts
SPRINT-2|[Nome da Sprint]|[Objetivo da Sprint]|[DD/MM/AAAA]|[DD/MM/AAAA]|[X]h|[X] pts
SPRINT-3|[Nome da Sprint]|[Objetivo da Sprint]|[DD/MM/AAAA]|[DD/MM/AAAA]|[X]h|[X] pts
SPRINT-4|[Nome da Sprint]|[Objetivo da Sprint]|[DD/MM/AAAA]|[DD/MM/AAAA]|[X]h|[X] pts

STORIES:
[CÓDIGO]-[NUM]|[Título completo]|[Descrição detalhada do que fazer]|[Critérios de aceite específicos]|EPIC-[N]|SPRINT-[N]|[X]h|[X] pts|[High/Medium/Low]|[DD/MM/AAAA]|[DD/MM/AAAA]|[Dependências ou NONE]

EXEMPLO DE FORMATO:
FPF-001|Login e Autenticação JWT|Implementar formulário de login responsivo com autenticação JWT, rotas /auth/login, /auth/refresh, /auth/logout, armazenamento seguro com httpOnly e middleware de proteção|Usuário deve conseguir fazer login com credenciais válidas, receber token JWT, acessar rotas protegidas e fazer logout com sucesso|EPIC-1|SPRINT-1|16h|5 pts|High|27/08/2025|29/08/2025|NONE

INSTRUÇÕES CRÍTICAS:
- Gere EXATAMENTE no formato PIPE-SEPARATED acima
- Cada story deve ter TODOS os 12 campos preenchidos
- Use apenas os EPIC-X e SPRINT-X referenciados nas seções acima
- Datas em formato DD/MM/AAAA
- Prioridades: High/Medium/Low
- Dependências: use os IDs das stories ou NONE
- Gere NO MÍNIMO 20 stories distribuídas entre as 4+ sprints

IMPORTANTE: Após gerar a estrutura acima, você DEVE continuar com o restante da análise tradicionalmente.`;
  }

  async analyzeRequirements(request: ScopeAnalysisRequest): Promise<ScopeAnalysisResponse> {
    try {
      // Processar arquivos de texto anexados
      let fileContents = '';
      if (request.attachedFiles?.length) {
        console.log('\n=== DEBUG: Arquivos recebidos no service ===');
        console.log(`Total de arquivos: ${request.attachedFiles.length}`);
        
        request.attachedFiles.forEach((file, index) => {
          console.log(`Arquivo ${index + 1}: ${file.name} (${file.type})`);
          console.log(`Tem conteúdo: ${!!file.content}`);
          if (file.content) {
            console.log(`Tamanho do conteúdo: ${file.content.length} caracteres`);
            console.log(`Início do conteúdo: ${file.content.substring(0, 100)}...`);
          }
        });
        
        const textFiles = request.attachedFiles.filter(file => 
          file.content && !file.type.startsWith('image/')
        );
        
        console.log(`Arquivos de texto filtrados: ${textFiles.length}`);
        
        if (textFiles.length > 0) {
          fileContents = `\n\nCONTEÚDO DOS ARQUIVOS ANEXADOS:\n` +
            textFiles.map(file => 
              `\n--- ARQUIVO: ${file.name} ---\n${file.content}\n--- FIM DO ARQUIVO ---\n`
            ).join('\n');
            
          console.log('Conteúdo dos arquivos adicionado ao prompt');
          console.log(`Tamanho total do fileContents: ${fileContents.length}`);
        }
      }
      
      const userMessage = `
PROJETO PARA ANÁLISE DETALHADA DE REQUISITOS:

${fileContents ? 'ATENÇÃO: DOCUMENTOS ANEXADOS CONTÊM INFORMAÇÕES DETALHADAS DO PROJETO - USE-OS COMO FONTE PRINCIPAL!\n\n' : ''}DESCRIÇÃO DO PROJETO:
${request.projectDescription}

${request.additionalInfo ? `INFORMAÇÕES ADICIONAIS:\n${request.additionalInfo}` : ''}

${request.attachedDocuments?.length ? `DOCUMENTOS ANEXADOS:\n${request.attachedDocuments.join('\n')}` : ''}${fileContents}

INSTRUÇÕES OBRIGATÓRIAS:
1. PRIORIZE SEMPRE o conteúdo dos arquivos anexados - eles contêm a informação principal do projeto
2. Use o conteúdo dos documentos como fonte primária de informações
3. Analise PROFUNDAMENTE o projeto descrito nos arquivos e na descrição
4. Gere NO MÍNIMO 15-20 requisitos específicos baseados no conteúdo real dos documentos
5. Cada requisito DEVE ter: descrição rica, comportamento, regras, casos de uso, critérios de aceite e O QUE FAZER
6. Para cada User Story, inclua OBRIGATORIAMENTE:
   - O que fazer: Explicação direta e clara do que implementar
   - Estimativa em horas: Tempo realístico para completar a task
   - Data de início: Quando a task deve começar
   - Data de fim: Quando a task deve estar pronta
   - Critérios de aceite específicos e mensuráveis
7. Calcule estimativas REALISTAS baseadas na complexidade real
8. Inclua dependências entre requisitos
9. Detalhe tecnologias ESPECÍFICAS para este projeto
10. ORGANIZE tudo em sprints de 2-3 semanas cada (4-8 sprints no total)
11. ESTRUTURE épicos e user stories no formato Jira COM DESCRIÇÕES TÉCNICAS COMPLETAS
12. DEFINA story points e prioridades para cada item
13. CALCULE cronograma com datas específicas
14. Use a data atual: ${new Date().toLocaleDateString('pt-BR')}
15. Siga EXATAMENTE o formato do sistema

ORGANIZAÇÃO EM SPRINTS OBRIGATÓRIA:
- DIVIDA o projeto em NO MÍNIMO 4-6 sprints de 2-3 semanas cada
- Cada sprint deve ter objetivo claro e mensurável  
- Agrupe requisitos relacionados na mesma sprint
- Respeite dependências entre requisitos
- Distribua os 20+ requisitos proporcionalmente entre as sprints (4-6 requisitos por sprint)
- Calcule story points (Fibonacci: 1,2,3,5,8,13,21)
- Defina MVP nas primeiras 2-3 sprints
- Inclua tasks técnicas (setup, configuração, testes)
- CERTIFIQUE-SE de que TODAS as sprints tenham stories específicas listadas

FORMATO JIRA OBRIGATÓRIO:
- Épicos com stories relacionadas
- User stories no formato: "Como [usuário], quero [funcionalidade], para [benefício]"
- O QUE FAZER OBRIGATÓRIO: Explicação clara e direta do que deve ser implementado
- ESTIMATIVA OBRIGATÓRIA: Horas necessárias para completar a task
- DATAS OBRIGATÓRIAS: Data de início e fim para cada story
- Acceptance criteria detalhados e mensuráveis
- Dependências claras entre stories
- Labels e components apropriados
- Workflow sugerido

RESULTADO ESPERADO:
Documento completo pronto para criação direta no Jira, com sprints organizadas, épicos estruturados e backlog detalhado.
      `;
      
      // Log da mensagem completa para debug
      console.log('\n=== DEBUG: Mensagem enviada para OpenAI ===');
      console.log(`Tamanho da mensagem: ${userMessage.length} caracteres`);
      console.log('Início da mensagem:', userMessage.substring(0, 500));
      if (fileContents) {
        console.log('\n--- Parte dos arquivos na mensagem ---');
        console.log(fileContents.substring(0, 1000));
      }

      // Preparar mensagens incluindo imagens se houver
      const messages: any[] = [
        {
          role: 'system',
          content: this.systemPrompt,
        }
      ];
      
      // Verificar se há imagens anexadas
      const imageFiles = request.attachedFiles?.filter(file => 
        file.type.startsWith('image/') && file.content
      ) || [];
      
      if (imageFiles.length > 0) {
        // Usar GPT-4 Vision com imagens
        const messageContent = [
          {
            type: 'text',
            text: userMessage,
          },
          ...imageFiles.map(file => ({
            type: 'image_url',
            image_url: {
              url: `data:${file.type};base64,${file.content}`,
              detail: 'high'
            }
          }))
        ];
        
        messages.push({
          role: 'user',
          content: messageContent,
        });
      } else {
        // Usar GPT-4 normal apenas com texto
        messages.push({
          role: 'user',
          content: userMessage,
        });
      }
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Suporta tanto texto quanto visão
        messages,
        temperature: 0.1, // Muito baixo para máxima precisão
        max_tokens: 16000, // Aumentado significativamente para análises detalhadas
      });

      const analysis = completion.choices[0].message.content || 'Erro ao gerar análise';

      return {
        analysis,
        approved: false,
      };
    } catch (error) {
      console.error('Erro ao chamar OpenAI:', error);
      throw new Error('Erro ao processar análise de requisitos');
    }
  }

  async approveAnalysis(analysisId: string): Promise<{ success: boolean; nextAgent: string }> {
    return {
      success: true,
      nextAgent: 'PO',
    };
  }
}