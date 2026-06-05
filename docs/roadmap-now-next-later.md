# CookPrice — Roadmap de Funcionalidades (Now / Next / Later)

> Metodologia: **Now** = crítico para o produto funcionar ou ser viável hoje · **Next** = melhoria significativa de valor após a base estar sólida · **Later** = expansão estratégica quando o produto estiver maduro.
>
> _Revisado com varredura completa de backend (controllers, services, requests, models, rotas), frontend (todas as páginas, componentes, fluxos de UX), banco de dados (17 migrations) e documentação existente._

---

## Estado Atual do Produto

### O que está implementado e funcionando
- Autenticação completa (registro, login, logout via Sanctum)
- CRUD de ingredientes e embalagens com paginação e busca
- CRUD de receitas com vinculação de ingredientes em fluxo de 3 etapas
- Cálculo de custo completo: custo por ingrediente, embalagens separadas, custo invisível (%), multiplicador de lucro, preço sugerido, margem derivada, custo/rendimento
- CMM (Custo Médio Móvel) ponderado atualizado a cada compra
- Controle de estoque: compras (atualizam CMM e estoque), ajuste manual, histórico de movimentações
- Produção de receitas com dedução automática de estoque (modo `force` para estoque insuficiente)
- Dashboard com contadores e lista de estoque crítico
- Modal de configurações no cabeçalho: `invisible_cost_pct`, `profit_multiplier`, `disable_stock_control`
- Troca de senha via modal no cabeçalho
- Notificações toast globais, loader global, autocomplete de ingredientes, criação rápida de ingrediente inline

### Infraestrutura técnica disponível mas não utilizada
- Tabela `password_reset_tokens` existe (Laravel padrão) — sem UI nem e-mail configurado
- Tabela `jobs`, `job_batches`, `failed_jobs` — fila de jobs pronta, nenhum job implementado
- Tabela `sessions` e `cache` — prontas para uso
- Tabela `personal_access_tokens` (Sanctum) — utilizada

---

## NOW — Prioridade Máxima

Itens que **bloqueiam o negócio ou causam fricção grave** na experiência do usuário hoje.

---

### 1. Sistema de Planos e Assinaturas

**Problema:** A documentação existente (`planos-funcionalidades.md`, `planos-implementacao.md`) detalha completamente um modelo de três tiers, mas **nenhuma linha de código foi implementada**. Não existe tabela `plans`, não existe `plan_id` em `users`, não existe nenhum gate de funcionalidade.

**O que foi planejado (já documentado internamente):**
| Plano | Preço | Receitas | Ingredientes | Precificação | Estoque | Histórico | Produção |
|-------|-------|----------|--------------|--------------|---------|-----------|----------|
| Gratuito | R$ 0 | 3 | 15 | Não | Não | Não | Não |
| Básico | R$ 19/mês | 15 | 60 | Sim | Não | Não | Não |
| Pro | R$ 39/mês | Ilimitado | Ilimitado | Sim | Sim | Sim | Sim |

**O que precisa ser construído:**
1. Migration: tabela `plans` (id, name, label, price, max_recipes, max_ingredients, has_pricing, has_stock, has_stock_history, has_production)
2. Migration: coluna `plan_id` em `users` com FK
3. Model `Plan` + relacionamento em `User`
4. Seeder com os três planos padrão
5. Gates no `RecipeController::store()` — verificar limite de receitas
6. Gates no `IngredientController::store()` — verificar limite de ingredientes
7. Gates no `StockController`, `PurchaseController` — verificar `has_stock`
8. Gates no `StockMovementController::index()` — verificar `has_stock_history`
9. Gates no `RecipeController::produce()` — verificar `has_production`
10. `RecipeCostService`: nulificar campos de precificação se `!has_pricing`
11. Exposição do plano atual em `GET /api/user`
12. UI: página de planos, indicadores de limite, CTA de upgrade

**Por que agora:** Sem isso, o produto não tem como ser monetizado. É o bloqueador de negócio número um.

---

### 2. Fluxo de Recuperação de Senha

**Problema:** A única forma de recuperar acesso é contatar suporte via WhatsApp (número hardcoded na página de login: `https://wa.me/5512981299109`). A tabela `password_reset_tokens` já existe no banco, mas não há UI, rota, nem driver de e-mail configurado.

**O que precisa ser construído:**
- Configurar driver de e-mail (Mailgun, SES ou SMTP) no `.env`
- Rota `POST /api/auth/forgot-password` + controller
- Rota `POST /api/auth/reset-password` + controller (com token)
- Página `/forgot-password` e `/reset-password` no frontend
- E-mail transacional com link de reset
- Remover ou substituir o link de WhatsApp na tela de login

**Por que agora:** Usuário que esquece a senha não tem como se recuperar sozinho. Isso gera abandono e churn.

---

### 3. Duplicar Receita

**Problema:** Criar uma receita similar a uma existente exige redigitar todos os ingredientes manualmente. Não existe nenhuma implementação de duplicação em backend ou frontend.

**O que precisa ser construído:**
- `POST /api/recipes/{id}/duplicate` — clona receita com sufixo "— Cópia", replica todos os `recipe_ingredients`
- Botão "Duplicar" na lista de receitas e no detalhe da receita
- Modal de confirmação simples antes de duplicar

**Por que agora:** É uma das ações mais frequentes em produtos de culinária. A ausência gera frustração direta.

---

### 4. Ampliar Unidades de Medida

**Problema:** O sistema aceita apenas 3 unidades: `g`, `ml` e `un`. Produtores trabalham com kg, L, colher de sopa (cs), xícara, etc. A limitação está no enum do frontend (select fixo) e na validação do backend (`in:[g, ml, un]`).

**Impacto real:** Um usuário que compra 1 kg de farinha não consegue cadastrar "kg" — precisa cadastrar em gramas e lembrar de sempre converter mentalmente.

**O que precisa ser construído:**
- Backend: adicionar `kg`, `L`, `cs`, `cx`, `pc` (ou tornar campo livre com lista de sugestões)
- Frontend: expandir o select de unidade ou mudar para campo com autocomplete + sugestões
- Manter retrocompatibilidade com registros existentes em `g`/`ml`/`un`

**Por que agora:** Limitação de UX que bloqueia adoção por parte de usuários que não trabalham só com gramas.

---

### 5. Onboarding e Estados Vazios Consistentes

**Problema:** Algumas páginas têm estados vazios com dicas, outras não. Um novo usuário no dashboard vê contadores zerados sem nenhuma orientação de por onde começar.

**O que precisa ser construído:**
- Estado vazio com instrução e CTA em: Dashboard (sem ingredientes), Ingredientes (lista vazia), Receitas (lista vazia), Estoque (sem stock)
- Checklist de primeiros passos no Dashboard: "Adicione um ingrediente → Crie uma receita → Registre seu estoque"
- Destaque visual nos primeiros dias de conta

**Por que agora:** Onboarding ruim = abandono na primeira sessão.

---

## NEXT — Alta Prioridade

Itens que **ampliam o valor** do produto de forma significativa. A base já funciona; agora é hora de tornar o CookPrice indispensável.

---

### 6. Suite de Testes Automatizados

**Problema:** O repositório tem dois arquivos de teste (esqueletos padrão do Laravel) e zero cobertura real. Para uma aplicação de cálculo financeiro que usa CMM, cálculo de margem e dedução de estoque, ausência de testes é um risco concreto de regressão silenciosa.

**Prioridade de cobertura:**
- `RecipeCostService::calculate()` — edge cases: receita sem embalagens, multiplicador = 1, custo invisível = 0
- `StockMovementService::purchase()` — CMM ponderado, estoque zero, compra de múltiplos pacotes
- `StockMovementService::deduct()` e `adjust()` — quantidades negativas, stock zero
- `RecipeController::produce()` — flags `force` e `disable_stock_control`
- Authorization: garantir que user A não acessa recursos do user B

---

### 7. Custo no Ajuste de Estoque

**Problema:** Quando o usuário faz um ajuste manual de estoque (`PATCH /api/ingredients/{id}/stock`), o `unit_price` é calculado com base no `last_price` atual do ingrediente — o usuário não pode informar um custo diferente. Isso faz o CMM derivar quando o ajuste representa uma compra informal ou transferência de outro lote.

**O que precisa ser construído:**
- Campo opcional "Custo por unidade" no modal de ajuste de estoque
- Se informado: usar esse valor no `StockMovement.unit_price` e recalcular CMM
- `AdjustStockRequest`: adicionar `unit_price` como campo opcional

---

### 8. Valorização do Estoque (Inventory Valuation)

**Descrição:** Mostrar o valor total do estoque em reais, calculado como `stock_quantity × (last_price / package_size)` para cada ingrediente.

**Inclui:**
- Valor total na página de Estoque (header ou card de resumo)
- Valor por ingrediente na tabela
- Filtro por tipo (ingredientes vs. embalagens separados)
- Indicação de itens sem preço cadastrado

---

### 9. Busca de Receitas por Ingrediente

**Descrição:** "Quais receitas usam farinha de trigo?" — hoje não tem como descobrir sem abrir cada receita individualmente.

**Inclui:**
- Filtro "Ingrediente" na página de Receitas
- Autocomplete de ingrediente para filtrar
- Link reverso na página de detalhe do ingrediente: "Usado em X receitas"

---

### 10. Histórico de Produção por Receita

**Descrição:** Os movimentos de estoque do tipo `production` já existem e têm `recipe_id`, mas a página de detalhe da receita não mostra quando ela foi produzida nem quantas vezes.

**Inclui:**
- Seção "Histórico de Produção" na página de detalhe da receita
- Colunas: Data, Vezes produzidas, Custo total no momento, Ingredientes deduzidos
- Paginação

---

### 11. Relatório de Lucratividade por Receita

**Descrição:** Análise de rentabilidade do portfólio.

**Inclui:**
- Ranking de receitas por margem de lucro (% e valor absoluto)
- Custo atual vs. preço sugerido vs. preço de venda real (quando implementado)
- Impacto de cada ingrediente no custo total
- Indicação de receitas "no vermelho" (multiplicador < 2, margem < 30%)

---

### 12. Histórico de Preços de Ingrediente com Visualização

**Descrição:** A tabela `stock_movements` já guarda `unit_price` em cada compra — os dados existem. Falta uma UI para visualizar a evolução de preço ao longo do tempo.

**Inclui:**
- Gráfico de linha: preço por unidade × data da compra
- Variação percentual entre última e penúltima compra
- Custo médio dos últimos 30/60/90 dias
- Acessível via modal de histórico já existente ou aba na página de ingrediente

---

### 13. Alerta de Aumento de Preço de Ingrediente

**Descrição:** Quando uma compra é registrada com preço por unidade significativamente maior que o CMM anterior (ex: +15%), alertar o usuário com o impacto nas receitas afetadas.

**Inclui:**
- Comparação automática com `last_price` anterior no `PurchaseController`
- Lista de receitas impactadas com variação de custo estimada
- Sugestão de revisar preço de venda
- Threshold configurável (padrão: +15%)

---

### 14. Exportação de Receita em PDF

**Descrição:** Gerar ficha técnica da receita em PDF para imprimir, compartilhar ou arquivar.

**Inclui:**
- Ficha com: nome, rendimento, ingredientes (com quantidades e subtotais), custo total, preço sugerido por unidade, margem
- Instalação do pacote `barryvdh/laravel-dompdf`
- Rota `GET /api/recipes/{id}/pdf`
- Botão "Exportar PDF" na página de detalhe da receita

---

### 15. Exportação de Dados em CSV

**Descrição:** Permitir que o usuário exporte seus dados para planilha.

**Inclui:**
- Exportar lista de ingredientes (nome, tipo, unidade, preço, estoque atual, valor em estoque)
- Exportar lista de receitas com custos calculados
- Exportar movimentações de estoque por período (filtro de data)
- Links de download nas páginas correspondentes

---

### 16. Links Clicáveis no Histórico de Movimentações

**Problema:** Na coluna "Ref." do histórico de movimentações (modal de histórico no estoque), o nome da receita aparece como texto simples — não é um link. O usuário não pode navegar diretamente para a receita que gerou aquela dedução.

**O que precisa ser construído:**
- Tornar o nome da receita um link `<a href="/recipes/{recipe_id}">` no componente de histórico

---

### 17. Controle de Fornecedores

**Descrição:** Rastrear de qual fornecedor veio cada compra.

**Inclui:**
- CRUD de fornecedores (nome, contato, observações)
- Campo "Fornecedor" opcional ao registrar uma compra
- Filtro de movimentações por fornecedor
- Comparativo de preços entre fornecedores para o mesmo ingrediente

---

### 18. Conversão de Unidades

**Descrição:** Suporte a conversão automática entre unidades compatíveis (g ↔ kg, ml ↔ L).

**Inclui:**
- Mapa de conversões no backend/frontend
- Na receita: permitir inserir ingrediente em unidade diferente do cadastro (ex: ingrediente em kg, receita usa em gramas)
- Exibir equivalência no detalhe da receita
- Proteger contra conversões inválidas (g ↔ ml não converte)

---

### 19. Produção em Lote (Batch)

**Descrição:** Registrar produção de múltiplas receitas de uma vez em uma única operação.

**Inclui:**
- Selecionar N receitas + quantidades a produzir em uma tela
- Verificar estoque disponível para todo o lote antes de confirmar
- Deduzir estoque de todas as receitas em uma transação
- Registro agrupado no histórico de movimentações

---

## LATER — Visão Estratégica

Itens de maior escopo que fazem sentido quando o produto tiver base de usuários consolidada e os fluxos core maduros.

---

### 20. Importação de Dados via CSV

**Descrição:** Migração facilitada para usuários vindos do Excel ou de outros sistemas.

**Inclui:**
- Template CSV para download (ingredientes, receitas)
- Parser e validação de dados antes da importação
- Relatório de erros e itens importados
- Pacote Laravel para parsing de CSV/XLSX

---

### 21. Previsão de Ruptura de Estoque

**Descrição:** Estimar quando cada ingrediente vai acabar com base no histórico de produções.

**Inclui:**
- Taxa de consumo médio por período (últimos 30/60 dias)
- Data estimada de ruptura por ingrediente
- Alerta no dashboard de ingredientes que vão acabar em X dias
- Sugestão de quantidade mínima de reposição

---

### 22. Controle de Vendas e Pedidos

**Descrição:** Registrar pedidos de clientes e vendas realizadas para fechar o ciclo financeiro.

**Inclui:**
- Cadastro de clientes
- Registro de pedidos (receita × quantidade × preço vendido real)
- Comparação automática entre custo de produção e preço de venda realizada
- Relatório de faturamento e margem real por período
- COGS (Custo dos Produtos Vendidos) calculado

---

### 23. Rastreamento de Desperdício e Perdas

**Descrição:** Distinguir ajustes de estoque normais de perdas reais (ingrediente vencido, quebra, etc.) para análise de custos ocultos.

**Inclui:**
- Tipo `waste` no enum de `stock_movements` (além de purchase/production/adjustment)
- Campo "Motivo" obrigatório no registro de perda
- Relatório de perdas por período e por ingrediente
- Impacto das perdas no custo real de produção

---

### 24. Multi-usuário e Equipe

**Descrição:** Conta com múltiplos usuários com papéis diferentes.

**Inclui:**
- Convite por e-mail
- Papéis: Administrador, Operador de Produção, Somente Leitura
- Log de auditoria de ações por usuário
- Integração com sistema de planos (Pro permite X membros)

---

### 25. Versionamento de Receitas

**Descrição:** Manter histórico de versões de receita para auditoria e comparação de custos ao longo do tempo.

**Inclui:**
- Snapshot automático ao editar ingredientes de uma receita
- Comparação entre versões (ingredientes adicionados/removidos, variação de custo)
- Restaurar versão anterior
- Linha do tempo de alterações

---

### 26. Notificações por E-mail

**Descrição:** Alertas proativos enviados por e-mail.

**Inclui:**
- Alerta de estoque crítico (diário ou semanal)
- Notificação de aumento de preço de ingrediente
- Resumo semanal de produções e custos
- Depende de driver de e-mail configurado (bloqueado pelo item #2)
- Usar sistema de filas já presente (tabela `jobs`)

---

### 27. App Mobile Nativo / PWA

**Descrição:** Empacotamento como PWA instalável ou app nativo.

**Inclui:**
- Instalação na tela inicial do celular
- Acesso offline básico (cache de receitas e ingredientes)
- Notificações push para alertas de estoque crítico
- Câmera para escanear código de barras de embalagens

---

### 28. Integração com Nota Fiscal Eletrônica (NF-e)

**Descrição:** Importar NF-e para registrar compras automaticamente.

**Inclui:**
- Upload de XML de NF-e
- Parser automático de itens, quantidades e preços
- Mapeamento de produto da nota para ingrediente cadastrado
- Cria automaticamente uma `Purchase` com os itens mapeados

---

### 29. Marketplace de Receitas / Comunidade

**Descrição:** Espaço de receitas públicas compartilhadas pela comunidade.

**Inclui:**
- Publicar receita com visibilidade pública (custos omitidos)
- Busca e filtro de receitas da comunidade
- "Usar esta receita" — importa para a conta do usuário
- Avaliações básicas

---

## Resumo Visual

| Prazo | # | Feature | Impacto | Complexidade | Observação |
|-------|---|---------|---------|--------------|------------|
| **NOW** | 1 | Sistema de Planos/Assinaturas | Negócio | Alta | Monetização bloqueada sem isso |
| **NOW** | 2 | Recuperação de Senha | Alto | Baixa | Infra já existe no DB |
| **NOW** | 3 | Duplicar Receita | Médio | Baixa | Ação frequente, sem implementação |
| **NOW** | 4 | Ampliar Unidades de Medida | Alto | Baixa | Só 3 unidades hoje (g, ml, un) |
| **NOW** | 5 | Onboarding / Estados Vazios | Alto | Baixa | Alguns existem, incompleto |
| **NEXT** | 6 | Suite de Testes Automatizados | Risco | Média | Zero cobertura em app financeiro |
| **NEXT** | 7 | Custo no Ajuste de Estoque | Médio | Baixa | CMM deriva sem isso |
| **NEXT** | 8 | Valorização do Estoque | Médio | Baixa | Dados já disponíveis |
| **NEXT** | 9 | Busca de Receitas por Ingrediente | Médio | Baixa | Caso de uso frequente |
| **NEXT** | 10 | Histórico de Produção por Receita | Médio | Baixa | Dados já existem (stock_movements) |
| **NEXT** | 11 | Relatório de Lucratividade | Alto | Média | Core do produto |
| **NEXT** | 12 | Histórico de Preços com Gráfico | Médio | Baixa | Dados já existem |
| **NEXT** | 13 | Alerta de Aumento de Preço | Alto | Baixa | Lógica simples, alto valor |
| **NEXT** | 14 | Exportação PDF de Receita | Médio | Baixa | Precisa instalar dompdf |
| **NEXT** | 15 | Exportação CSV | Médio | Baixa | Sem dependência nova |
| **NEXT** | 16 | Links no Histórico de Movimentações | Baixo | Muito Baixa | Fix de UX pontual |
| **NEXT** | 17 | Controle de Fornecedores | Médio | Média | Nova tabela necessária |
| **NEXT** | 18 | Conversão de Unidades | Alto | Média | Depende de ampliar unidades (NOW #4) |
| **NEXT** | 19 | Produção em Lote | Médio | Média | Lógica transacional |
| **LATER** | 20 | Importação CSV | Médio | Alta | Precisará de parser |
| **LATER** | 21 | Previsão de Ruptura de Estoque | Alto | Alta | Modelo estatístico |
| **LATER** | 22 | Controle de Vendas e Pedidos | Alto | Alta | Novos módulos |
| **LATER** | 23 | Rastreamento de Desperdício | Médio | Baixa | Novo tipo de movimento |
| **LATER** | 24 | Multi-usuário / Equipe | Alto | Muito Alta | Redesign de auth |
| **LATER** | 25 | Versionamento de Receitas | Médio | Alta | Sistema de snapshots |
| **LATER** | 26 | Notificações por E-mail | Alto | Média | Depende de e-mail (NOW #2) + filas |
| **LATER** | 27 | PWA / App Mobile Nativo | Alto | Muito Alta | Depende de responsividade estável |
| **LATER** | 28 | Integração NF-e | Alto | Muito Alta | Parser XML complexo |
| **LATER** | 29 | Marketplace de Receitas | Médio | Muito Alta | Features sociais |

---

## Dependências entre itens

```
NOW #2 (Recuperação de Senha)
  └── LATER #26 (Notificações por E-mail) depende de e-mail configurado

NOW #4 (Ampliar Unidades)
  └── NEXT #18 (Conversão de Unidades) depende de mais unidades disponíveis

NOW #1 (Planos/Assinaturas)
  └── Desbloqueia monetização e define o escopo de acesso de cada usuário

NEXT #6 (Testes) — recomendável antes de qualquer refactor grande
LATER #24 (Multi-usuário) — afeta auth em todo o sistema, implementar por último
```

---

*Gerado em: junho/2026 · Baseado em varredura completa de backend, frontend, banco de dados e documentação do CookPrice.*
