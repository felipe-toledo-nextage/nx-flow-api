# Sistema de Usuários - NextAge ScopeFlow API

Este documento descreve o sistema de usuários implementado com TypeORM e PostgreSQL.

## 🏗️ Estrutura da Tabela de Usuários

### Entity: `User`
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  avatar?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailVerificationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetTokenExpiresAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
```

### Enums
```typescript
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MANAGER = 'manager',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}
```

## 📋 Endpoints da API

### Usuários
- `GET /users` - Listar usuários (com paginação e filtros)
- `GET /users/:id` - Obter usuário por ID
- `GET /users/profile` - Obter perfil do usuário logado
- `POST /users` - Criar novo usuário
- `PUT /users/:id` - Atualizar usuário
- `DELETE /users/:id` - Deletar usuário
- `PUT /users/:id/status` - Alterar status do usuário
- `PUT /users/:id/role` - Alterar role do usuário
- `PUT /users/:id/password` - Alterar senha do usuário
- `POST /users/:id/verify-email` - Verificar email do usuário

### Query Parameters para Listagem
```typescript
interface QueryUserDto {
  search?: string;        // Busca por nome
  role?: UserRole;        // Filtrar por role
  status?: UserStatus;    // Filtrar por status
  page?: number;          // Página (padrão: 1)
  limit?: number;         // Limite por página (padrão: 10, máx: 100)
  orderBy?: string;       // Campo para ordenação (padrão: createdAt)
  order?: 'ASC' | 'DESC'; // Direção da ordenação (padrão: DESC)
}
```

## 🔧 Configuração do Banco de Dados

### Variáveis de Ambiente
```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=nextage_scopeflow
NODE_ENV=development
```

### Scripts Disponíveis
```bash
# Instalar dependências
npm install

# Inicializar banco de dados
npm run db:init

# Executar migrações
npm run db:migrate

# Executar em desenvolvimento
npm run start:dev
```

## 🚀 Como Usar

### 1. Configurar Banco de Dados
```bash
# Criar banco PostgreSQL
createdb nextage_scopeflow

# Ou usar Docker
docker run --name postgres-nextage -e POSTGRES_PASSWORD=password -e POSTGRES_DB=nextage_scopeflow -p 5432:5432 -d postgres:15
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=nextage_scopeflow

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

### 3. Inicializar o Sistema
```bash
# Instalar dependências
npm install

# Inicializar banco de dados
npm run db:init

# Executar aplicação
npm run start:dev
```

## 👤 Usuário Padrão

O sistema cria automaticamente um usuário administrador:

- **Email:** admin@example.com
- **Senha:** Admin123!
- **Role:** ADMIN
- **Status:** ACTIVE

## 🔐 Funcionalidades de Segurança

### Hash Automático de Senhas
- Senhas são automaticamente hasheadas com bcrypt (12 rounds)
- Hash é aplicado antes de salvar no banco
- Método `validatePassword()` para verificação

### Validações
- Email único no sistema
- Validação de formato de email
- Senha com mínimo 8 caracteres
- Validação de telefone (formato brasileiro)
- Validação de enums (role e status)

### Tokens de Segurança
- Token de verificação de email
- Token de reset de senha com expiração
- Controle de último login

## 📊 Funcionalidades Avançadas

### Paginação
```typescript
interface PaginatedUsersResponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

### Filtros
- Busca por nome (LIKE)
- Filtro por role
- Filtro por status
- Ordenação personalizada

### Métodos do Service
- `findAll(queryDto)` - Listagem com paginação
- `findById(id)` - Buscar por ID
- `findByEmail(email)` - Buscar por email
- `create(createUserDto)` - Criar usuário
- `update(id, updateUserDto)` - Atualizar usuário
- `delete(id)` - Deletar usuário
- `updateLastLogin(id)` - Atualizar último login
- `updatePassword(id, password)` - Alterar senha
- `verifyEmail(id)` - Verificar email
- `changeStatus(id, status)` - Alterar status
- `changeRole(id, role)` - Alterar role

## 🧪 Exemplos de Uso

### Criar Usuário
```bash
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "password": "Senha123!",
    "role": "user",
    "phone": "+5511999999999"
  }'
```

### Listar Usuários
```bash
curl -X GET "http://localhost:3001/users?page=1&limit=10&search=joao&role=user" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Atualizar Usuário
```bash
curl -X PUT http://localhost:3001/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "João Silva Atualizado",
    "phone": "+5511888888888"
  }'
```

## 🔄 Migrações

O sistema usa `synchronize: true` em desenvolvimento, que automaticamente cria/atualiza as tabelas. Para produção, use migrações:

```bash
# Gerar migração
npm run typeorm migration:generate -- -n CreateUsersTable

# Executar migrações
npm run typeorm migration:run

# Reverter migração
npm run typeorm migration:revert
```

## 🚨 Considerações de Produção

- [ ] Desabilitar `synchronize: true`
- [ ] Configurar migrações
- [ ] Usar SSL para conexão com banco
- [ ] Configurar pool de conexões
- [ ] Implementar backup automático
- [ ] Configurar logs de auditoria
- [ ] Implementar soft delete
- [ ] Adicionar índices para performance

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação ou entre em contato com a equipe de desenvolvimento.
