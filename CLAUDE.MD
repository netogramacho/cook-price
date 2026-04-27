# CookPrice - Diretrizes de Desenvolvimento

Arquivo de referência para manter consistência, qualidade e padrões em todo o projeto, independente da feature ou etapa de desenvolvimento.

---

## 🎯 Filosofia do Projeto

- **MVP First**: Focar no essencial, não over-engineer
- **Qualidade de Código**: Código limpo, legível, bem estruturado
- **Separação de Responsabilidades**: Backend e Frontend completamente desacoplados
- **Velocidade de Entrega**: Priorizar funcionalidade e consistência
- **Escalabilidade**: Arquitetura preparada para crescimento futuro
- **Manutenibilidade**: Código que será fácil de entender e modificar

---

## 📝 Padrões de Código Laravel

### Controllers
- Um controller por recurso principal
- Métodos seguem nomenclatura padrão: `index`, `show`, `store`, `update`, `destroy`
- Injeção de dependência para Services e Repositories
- Validação delegada para Form Requests
- Respostas sempre padronizadas (ver seção "Estrutura de Resposta")
- Máximo uma responsabilidade por método

### Models
- Um modelo por tabela
- Relacionamentos bem definidos (`hasMany`, `belongsTo`, `belongsToMany`, etc)
- Eager loading padrão com `with()` para evitar N+1
- Scopes para queries comuns e reutilizáveis
- Proteção de atributos sensíveis com `$hidden` ou `$visible`
- Casts automáticos de tipos (`$casts`)
- Métodos acessores para lógica de apresentação

### Validação (Form Requests)
- Form Requests customizadas por ação (não reutilizar a mesma para store e update)
- Regras claras e reutilizáveis
- Mensagens de erro em português
- Validação no backend é obrigatória (nunca confiar em frontend)
- Exceções tratadas automaticamente pelo Laravel

### Rotas
- Agrupar por prefixo lógico (`/api/recipes`, `/api/ingredients`, etc)
- Usar `Route::apiResource()` quando aplicável
- Middleware de autenticação em rotas protegidas
- Nomenclatura de rotas descritiva
- Sem versionamento de API por enquanto (deixar preparado para v1, v2 depois)

### Banco de Dados
- Migrations nomeadas descritivamente e com timestamp
- Foreign keys com `onDelete('cascade')` quando apropriado
- Índices em colunas de busca frequente
- Índices em foreign keys
- UNIQUE constraints onde necessário
- Timestamps automáticos (`created_at`, `updated_at`) em todas as tabelas
- Soft deletes apenas se necessário (manter simples)

### Services & Repositories
- Extrair lógica complexa em Services
- Services focam em regra de negócio
- Repositories para abstração de dados (opcional, usar quando necessário)
- Um arquivo por classe
- Injetáveis via constructor

---

## 🔐 Autenticação & Autorização

### Sanctum
- Token-based como padrão para API
- Tokens sem expiração por enquanto (Laravel padrão)
- Cada usuário acessa apenas seus dados
- Validação de `user_id` em todas as queries
- Middleware de autenticação em rotas protegidas

### Proteção
- CORS habilitado apenas para domínios permitidos
- Validar token em cada request (middleware)
- Senhas com hash bcrypt (Laravel automático)
- Nunca retornar senhas em respostas da API
- Validar autorização no controller (user pode acessar este recurso?)

---

## 📊 Estrutura de Resposta da API

### Sucesso (HTTP 200, 201)
```json
{
  "success": true,
  "data": { },
  "message": "descrição clara da ação realizada"
}
```

### Erro de Validação (HTTP 422)
```json
{
  "success": false,
  "errors": {
    "campo": ["mensagem de erro em português"]
  },
  "message": "Falha na validação dos dados"
}
```

### Erro Geral (HTTP 400, 401, 403, 404, 500)
```json
{
  "success": false,
  "message": "descrição clara e amigável do erro",
  "error_code": "ERROR_CODE_CONSTANT"
}
```

### Regras de Resposta
- Sempre incluir `success` booleano
- `data` deve conter o recurso principal (nunca nulo em sucesso)
- `message` em português, claro e direto
- HTTP status codes corretos
- Nunca expor stack traces ou detalhes técnicos ao cliente

---

## 🗄️ Padrões de Banco de Dados

### Convenções de Nomenclatura
- Tabelas em **plural em inglês**: `users`, `recipes`, `ingredients`
- Colunas em **snake_case**: `user_id`, `last_price`, `created_at`
- Primary key sempre `id` do tipo **UUID** (`$table->uuid('id')->primary()`)
- **Nunca usar auto-increment** — todas as tabelas usam UUID como PK
- Models devem usar `use HasUuids;` (trait do Laravel) para geração automática
- Foreign keys: `{tabela_singular}_id` do tipo `uuid` (ex: `$table->foreignUuid('user_id')`)
- Timestamps: `created_at`, `updated_at` (always)
- Soft deletes: `deleted_at` (apenas se necessário)

### Índices
- Foreign keys sempre indexadas
- Colunas de busca frequente (`email`, `name`) com índice
- UNIQUE para campos únicos (`email`, `slug`)
- Índices compostos para queries comuns

### Relacionamentos
- Usar convenções do Laravel (nomes descritivos)
- Lazy loading evitado com eager loading
- Cascade delete apenas quando apropriado
- Relacionamentos bem definidos nos modelos

---

## 🛠️ Padrões de Desenvolvimento

### Naming Conventions
- **Classes**: `PascalCase` (ex: `RecipeController`, `UserRequest`, `IngredientService`)
- **Métodos/Funções**: `camelCase` (ex: `getRecipeCost()`, `storeIngredient()`)
- **Constantes**: `UPPER_SNAKE_CASE` (ex: `MAX_UPLOAD_SIZE`, `DEFAULT_LIMIT`)
- **Variáveis**: `snake_case` (ex: `$user_id`, `$total_cost`, `$recipe_name`)
- **Arquivos**: `PascalCase.php` para classes (ex: `RecipeController.php`)

### Estrutura de Arquivos
```
app/
  ├── Models/              # Um arquivo por modelo
  ├── Http/
  │   ├── Controllers/     # Um controller por recurso
  │   └── Requests/        # Validações customizadas
  ├── Services/            # Lógica de negócio complexa
  ├── Traits/              # Comportamentos reutilizáveis
  └── Exceptions/          # Exceções customizadas

routes/
  └── api.php              # Todas as rotas da API

database/
  ├── migrations/          # Migrações de database
  └── seeders/             # Dados iniciais (opcional)

resources/
  ├── js/                  # Frontend JavaScript
  ├── css/                 # Frontend CSS
  └── html/                # Frontend HTML
```

### Comentários
- Comentar lógica complexa ou não-óbvia
- PHPDoc para métodos públicos
- Português nos comentários é OK
- Evitar comentários óbvios (código fala por si)
- Documentar porque, não o quê

### DRY (Don't Repeat Yourself)
- Extrair lógica duplicada em Services/Traits
- Scopes para queries comuns
- Constants para valores repetidos
- Reutilizar validação via Form Requests

---

## 🧪 Qualidade de Código

### Checklist por Feature
- [ ] Validação no backend (Form Request)
- [ ] Mensagens de erro claras em português
- [ ] Tratamento de exceções apropriado
- [ ] Relacionamentos testados (eager loading)
- [ ] Filtro por `user_id` em queries (quando aplicável)
- [ ] Respostas padronizadas (structure da API)
- [ ] Documentação inline quando necessário
- [ ] Sem código duplicado
- [ ] Nomenclatura consistente

### Code Review Points
- Segurança (SQL injection, XSS, CSRF)
- Performance (N+1 queries, índices)
- Legibilidade (naming, comentários)
- Padrões (seguir convenções do projeto)
- Testes (cobertura adequada)

---

## 🚀 Performance & Escalabilidade

### Queries
- Eager loading com `with()` para evitar N+1
- Índices em colunas de filtro e busca
- Avoid `select()*` quando possível
- Lazy loading apenas em casos específicos
- Paginação para listas grandes

### Caching
- Deixar para depois (não prioritário no MVP)
- Estrutura preparada para adicionar depois
- Cache keys bem nomeadas

### Assets (Frontend)
- Minificar CSS e JavaScript em produção
- Lazy load de recursos pesados
- Versionamento de assets

---

## 🔧 Configuração & Deployment

### .env (Development)
```
APP_NAME=CookPrice
APP_ENV=local
APP_DEBUG=true
DB_CONNECTION=mysql
DB_DATABASE=cookprice_dev
```

### .env (Production)
```
APP_NAME=CookPrice
APP_ENV=production
APP_DEBUG=false
SANCTUM_STATEFUL_DOMAINS=seu-dominio.com.br
SESSION_DOMAIN=seu-dominio.com.br
```

### CORS
- Habilitar CORS apenas para domínios permitidos
- Header `Access-Control-Allow-Origin` configurado corretamente
- Métodos HTTP apropriados

### Segurança
- `.env` nunca em version control
- Senhas com hash bcrypt
- Tokens com expiração apropriada
- Rate limiting em endpoints críticos
- Validação de input/output

---

## 📦 Dependências

### Laravel
- Usar versão LTS (Long Term Support) quando possível
- Composer para gerenciamento
- Lock file (`composer.lock`) em version control

### Frontend
- Vanilla JavaScript (sem frameworks pesados)
- Fetch API para requests HTTP
- DOM manipulation nativo quando possível

---

## 🔄 Git & Versionamento

### Commits
- Mensagens descritivas em inglês
- Referências a issues/features
- Atomicidade (um commit = uma mudança lógica)

### Branches
- `main`: versão em produção
- `develop`: versão de desenvolvimento
- `feature/nome-da-feature`: para novas features
- `bugfix/nome-do-bug`: para correções

---

## 📚 Documentação

### API
- Endpoints documentados com método HTTP, caminho, parametros, respostas
- Exemplos de request/response
- Erros possíveis e códigos

### Código
- README.md com instruções de setup
- Documentação de variáveis de ambiente
- Instruções de deployment
- Changelog para mudanças importantes

---

## ✅ Checklist Geral

Usar antes de fazer deploy:
- [ ] Code segue padrões do projeto
- [ ] Testes passando (se houver)
- [ ] Sem console.log ou debug code
- [ ] Sem comentários desnecessários
- [ ] Performance aceitável
- [ ] Documentação atualizada
- [ ] .env corretamente configurado
- [ ] Migrations executadas
- [ ] Cache limpo (se aplicável)
