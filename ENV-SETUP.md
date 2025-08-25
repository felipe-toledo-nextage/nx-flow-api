# Configuração do Arquivo .env

Crie um arquivo `.env` na raiz do projeto `nextage-scopeflow-api` com o seguinte conteúdo:

```env
# ========================================
# CONFIGURAÇÕES DO SERVIDOR
# ========================================
PORT=3000
NODE_ENV=development

# ========================================
# CONFIGURAÇÕES JWT
# ========================================
# IMPORTANTE: Troque esta chave em produção!
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h

# ========================================
# CONFIGURAÇÕES CORS
# ========================================
CORS_ORIGIN=http://localhost:3019

# ========================================
# CONFIGURAÇÕES DE BANCO DE DADOS
# ========================================
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=nextage_scopeflow
DATABASE_USER=postgres
DATABASE_PASSWORD=password

# ========================================
# CONFIGURAÇÕES DE LOG
# ========================================
LOG_LEVEL=debug
```

## Passos para configurar:

1. **Crie o arquivo `.env`** na raiz do projeto `nextage-scopeflow-api`
2. **Configure o banco PostgreSQL**:
   ```bash
   # Criar banco
   createdb nextage_scopeflow
   
   # Ou usar Docker
   docker run --name postgres-nextage -e POSTGRES_PASSWORD=password -e POSTGRES_DB=nextage_scopeflow -p 5432:5432 -d postgres:15
   ```
3. **Instale as dependências do backend**:
   ```bash
   cd nextage-scopeflow-api
   npm install
   ```
4. **Inicialize o banco**:
   ```bash
   npm run db:init
   ```
5. **Execute o backend**:
   ```bash
   npm run start:dev
   ```
6. **Em outro terminal, execute o frontend**:
   ```bash
   cd nextage-scopeflow
   npm install
   npm run dev
   ```

## 🌐 Portas Configuradas:

- **Backend:** http://localhost:3000
- **Frontend:** http://localhost:3019
- **Banco de Dados:** localhost:5432

## ✅ Problemas Corrigidos:

- ❌ Erros de `null` no TypeORM → ✅ Usando `undefined`
- ❌ Validação de telefone problemática → ✅ Removida
- ❌ Configuração complexa → ✅ Simplificada
- ❌ Dependências incorretas → ✅ Corrigidas

## 🌱 Sistema de Seeding Automático:

O sistema agora cria automaticamente usuários padrão quando inicia:

### 👤 Usuários Criados Automaticamente:

1. **Admin Principal:**
   - **Email:** admin@teste.com
   - **Senha:** admin
   - **Role:** ADMIN
   - **Status:** ACTIVE

2. **Usuários de Exemplo:**
   - **João Silva:** joao@teste.com / 123456 (USER)
   - **Maria Santos:** maria@teste.com / 123456 (MANAGER)



### 🔄 Como Funciona:

- ✅ **Execução Automática:** Roda sempre que o backend inicia
- ✅ **Verificação de Existência:** Não cria duplicatas
- ✅ **Logs Detalhados:** Mostra o que foi criado ou se já existe
- ✅ **Tratamento de Erros:** Continua funcionando mesmo se houver problemas

### 📝 Logs de Exemplo:

```
🌱 Iniciando seeders...
👥 Executando seeder de usuários...
👤 Usuário admin criado: admin@teste.com
👤 Usuário de exemplo criado: joao@teste.com
👤 Usuário de exemplo criado: maria@teste.com
✅ Seeder de usuários concluído!
✅ Seeders concluídos!
```

Agora deve funcionar sem erros e com seeding automático! 🎯
