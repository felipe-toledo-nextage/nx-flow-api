# 🎯 Guia de Teste - Endpoint Jira Integration

## 📋 Endpoint: Buscar Dados do Projeto Jira

**URL:** `GET /jira/project/{projectId}/data`

### 🔐 Autenticação
- **Tipo:** Bearer Token (JWT)
- **Header:** `Authorization: Bearer {seu_jwt_token}`

### 📝 Como testar no Postman:

#### 1. **Fazer Login primeiro**
```
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "seu-email@exemplo.com",
  "password": "suaSenha123"
}
```
**Copiar o `access_token` da resposta!**

#### 2. **Listar projetos disponíveis**
```
GET http://localhost:3000/jira/projects
Authorization: Bearer {ACCESS_TOKEN_COPIADO}
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Projeto Exemplo",
      "description": "Descrição do projeto",
      "hasJiraConfig": true,
      "jiraProjectKey": "PROJ"
    }
  ]
}
```

#### 3. **Buscar dados do Jira**
```
GET http://localhost:3000/jira/project/{PROJECT_UUID}/data
Authorization: Bearer {ACCESS_TOKEN_COPIADO}
```

### 📊 Dados retornados:

```json
{
  "success": true,
  "data": {
    "project": {
      "key": "PROJ",
      "name": "Nome do Projeto"
    },
    "sprints": [
      {
        "id": 1,
        "name": "Sprint 1",
        "state": "closed",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-01-14T23:59:59.999Z",
        "completeDate": "2024-01-14T18:00:00.000Z",
        "goal": "Implementar funcionalidades básicas"
      }
    ],
    "issues": [
      {
        "id": "10001",
        "key": "PROJ-123",
        "summary": "Implementar login de usuário",
        "status": "Done",
        "issueType": "Story",
        "storyPoints": 5,
        "assignee": "João Silva",
        "created": "2024-01-01T09:00:00.000Z",
        "updated": "2024-01-10T15:30:00.000Z",
        "resolved": "2024-01-10T15:30:00.000Z",
        "sprint": "Sprint 1"
      }
    ],
    "metrics": {
      "totalIssues": 25,
      "completedIssues": 20,
      "totalStoryPoints": 125,
      "completedStoryPoints": 100,
      "averageVelocity": 16.67,
      "reworkRate": 8.0,
      "throughput": {
        "stories": 15,
        "bugs": 3,
        "tasks": 5,
        "epics": 2
      }
    }
  },
  "project": {
    "id": "uuid-do-projeto",
    "name": "Nome do Projeto",
    "description": "Descrição do projeto"
  }
}
```

### 🎯 Métricas para Dashboard:

#### **Velocity Chart (Planejado vs Entregue)**
- Use `sprints` + `metrics.averageVelocity`
- Calcule pontos planejados vs entregues por sprint

#### **Throughput (Tipos de Issue)**
- Use `metrics.throughput`
- Stories, Bugs, Tasks, Epics

#### **Métricas Principais**
- **Velocity Média:** `metrics.averageVelocity` SP
- **Taxa de Retrabalho:** `metrics.reworkRate`%
- **Entregas:** `(metrics.completedIssues / metrics.totalIssues * 100)`%
- **Story Points:** `metrics.completedStoryPoints / metrics.totalStoryPoints`

### 🚨 Possíveis Erros:

#### **401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
**Solução:** Verificar se o token JWT está válido e no header correto.

#### **403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "Acesso negado a este projeto"
}
```
**Solução:** Usuário logado não tem permissão para acessar este projeto.

#### **404 Not Found - Projeto**
```json
{
  "statusCode": 404,
  "message": "Projeto não encontrado"
}
```
**Solução:** Verificar se o UUID do projeto está correto.

#### **404 Not Found - Configuração Jira**
```json
{
  "statusCode": 404,
  "message": "Projeto não possui configurações completas do Jira"
}
```
**Solução:** O projeto precisa ter URL, email, API token e project key do Jira configurados.

#### **400 Bad Request - Credenciais Jira**
```json
{
  "statusCode": 400,
  "message": "Credenciais do Jira inválidas"
}
```
**Solução:** Verificar se o email e API token do Jira estão corretos.

#### **400 Bad Request - Projeto Jira**
```json
{
  "statusCode": 400,
  "message": "Projeto não encontrado no Jira"
}
```
**Solução:** Verificar se o project key existe no Jira configurado.

#### **400 Bad Request - Conexão**
```json
{
  "statusCode": 400,
  "message": "Não foi possível conectar com o Jira. Verifique a URL"
}
```
**Solução:** Verificar se a URL do Jira está correta e acessível.

### 🔍 Permissões de Acesso:

- **Admins/Managers:** Podem acessar qualquer projeto
- **Diretores:** Podem acessar projetos onde são diretores
- **Managers de Projeto:** Podem acessar projetos onde são managers
- **Clientes:** Podem acessar apenas projetos onde estão vinculados
- **Users:** Podem acessar qualquer projeto (assumindo equipe)

### 🧪 Exemplo de UUID para Teste:
Para testar, você precisará:
1. Criar um projeto com configurações do Jira completas
2. Copiar o UUID do projeto criado
3. Usar esse UUID na URL do endpoint

**Formato da URL final:**
`GET http://localhost:3000/jira/project/550e8400-e29b-41d4-a716-446655440000/data`