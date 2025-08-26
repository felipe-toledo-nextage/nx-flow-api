# Dashboard Endpoints - API Guide

## Endpoints Disponíveis

### 1. **GET /jira/projects** 
Retorna projetos baseado na role do usuário logado

**Comportamento por Role:**
- **Admin**: Vê todos os projetos
- **Director**: Vê apenas projetos que ele criou  
- **Manager/User**: Vê todos os projetos
- **Client**: Vê apenas projetos vinculados a ele

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "NX Bmad",
      "description": "Projeto descrição",
      "hasJiraConfig": true,
      "jiraProjectKey": "SCRUM"
    }
  ]
}
```

### 2. **GET /jira/dashboard/data**
Endpoint principal do dashboard - comportamento automático para clientes

**Para Clientes (role: 'client'):**
- Automaticamente busca o projeto vinculado
- Retorna dados do Jira imediatamente

**Para Admin/Director:**
- Retorna mensagem pedindo seleção de projeto
- `requiresProjectSelection: true`

**Response (Cliente):**
```json
{
  "success": true,
  "data": {
    "project": { "key": "SCRUM", "name": "NXBmad" },
    "metrics": {
      "totalIssues": 29,
      "completedIssues": 2,
      "inProgressIssues": 1,
      "todoIssues": 26,
      "completionRate": 7,
      "averageVelocity": 0,
      "averageLeadTime": 45,
      "reworkRate": 15,
      "recentCompletedIssues": 1,
      "statusDistribution": {
        "todo": 26,
        "inProgress": 1,
        "completed": 2,
        "blocked": 0
      },
      "throughput": {
        "stories": 0,
        "bugs": 0, 
        "tasks": 29,
        "epics": 0
      }
    }
  },
  "project": {
    "id": 1,
    "name": "NX Bmad",
    "description": "Descrição"
  }
}
```

**Response (Admin/Director sem seleção):**
```json
{
  "success": true,
  "data": null,
  "message": "Selecione um projeto para ver os dados do dashboard",
  "requiresProjectSelection": true
}
```

### 3. **GET /jira/dashboard/data/:projectId**
Para Admin/Director selecionar projeto específico

**Exemplo:** `GET /jira/dashboard/data/1`

**Verificações:**
- Admin: acesso a qualquer projeto
- Director: apenas projetos que ele criou
- Manager: acesso a qualquer projeto  
- Client: apenas projetos vinculados

**Response:** Igual ao endpoint `/jira/dashboard/data` mas com dados do projeto selecionado

## Métricas Calculadas

### **Métricas Básicas:**
- `totalIssues`: Total de issues no projeto
- `completedIssues`: Issues finalizadas
- `inProgressIssues`: Issues em desenvolvimento
- `todoIssues`: Issues a fazer
- `completionRate`: % de conclusão

### **Métricas Avançadas:**
- `averageVelocity`: Velocity média dos últimos 6 sprints
- `averageLeadTime`: Tempo médio de criação até resolução (em dias)
- `reworkRate`: % de retrabalho baseado em:
  - Issues atualizadas >7 dias após criação E em progresso
  - Issues >14 dias não resolvidas
  - Issues resolvidas que voltaram para progresso

### **Distribuição de Status:**
- `statusDistribution`: Contagem por status para gráficos
- `recentCompletedIssues`: Issues finalizadas nas últimas 4 semanas

### **Throughput por Tipo:**
- Stories, Bugs, Tasks, Epics contabilizados separadamente

## Tratamento de Status

O sistema detecta automaticamente vários formatos de status:

**Completed:** "Done", "Closed", "Resolved", "Finalizado", "Concluído"
**In Progress:** "Em Progresso", "In Progress", "Development", "Desenvolvimento"  
**Todo:** "A fazer", "To Do", "Open", "Aberto", "Backlog"
**Blocked:** "Blocked", "Bloqueado", "Impediment"

## Como Usar no Frontend

### Para Clientes:
```javascript
// Dashboard automático
const response = await fetch('/jira/dashboard/data');
// Sempre retorna dados do projeto vinculado
```

### Para Admin/Director:
```javascript
// 1. Listar projetos disponíveis
const projects = await fetch('/jira/projects');

// 2. Verificar se precisa selecionar projeto
const dashboardData = await fetch('/jira/dashboard/data');
if (dashboardData.requiresProjectSelection) {
  // Mostrar seletor de projetos
}

// 3. Buscar dados de projeto específico
const projectData = await fetch(`/jira/dashboard/data/${projectId}`);
```

## Campos para Gráficos

### Gráfico de Status (Donut/Pizza):
```javascript
{
  todo: metrics.statusDistribution.todo,
  inProgress: metrics.statusDistribution.inProgress, 
  completed: metrics.statusDistribution.completed,
  blocked: metrics.statusDistribution.blocked
}
```

### Gráfico de Throughput (Barras):
```javascript
{
  stories: metrics.throughput.stories,
  bugs: metrics.throughput.bugs,
  tasks: metrics.throughput.tasks, 
  epics: metrics.throughput.epics
}
```

### KPIs Principais:
- Taxa de Conclusão: `metrics.completionRate%`
- Velocity: `metrics.averageVelocity SP/sprint`
- Lead Time: `metrics.averageLeadTime dias`
- Taxa de Retrabalho: `metrics.reworkRate%`