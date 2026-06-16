# Preciva — Roadmap (Now / Next / Later)

> **Now** = bloqueia o lançamento ou causa fricção grave hoje
> **Next** = amplifica valor significativo após o produto estar no ar
> **Later** = expansão estratégica quando a base de usuários estiver consolidada

---

## Estado Atual do Produto (junho/2026)

**Autenticação** — Registro, login, logout, verificação de e-mail, recuperação de senha, troca de senha

**Ingredientes** — CRUD com busca, preço por embalagem, unidade de medida, tipo (ingrediente/embalagem)

**Receitas** — CRUD em 3 etapas (dados → ingredientes → embalagens), busca por nome

**Cálculo de Custos** — Ingredientes, embalagem, custos invisíveis (%), custo de produção, preço sugerido por receita e por unidade, margem de lucro

**Planos e Monetização** — 3 tiers (Gratuito / Basic / Plus), gates por `has_pricing` e `has_production`, limites quantitativos, integração MercadoPago, drawer de upgrade com upsell contextual (blur + olhinho nos campos bloqueados)

**Produções** — Registrar lote com snapshot imutável, histórico paginado, resumo diário e mensal, exclusão com confirmação

**Identidade** — Rebrand para Preciva com logo SVG

---

## NOW — Crítico para o Lançamento

### 1. Ampliar Unidades de Medida

**Problema:** Só aceita `g`, `ml` e `un`. Confeiteiros compram em kg, L, cx, pacote. Quem tem 1 kg de farinha cadastra 1000 g e converte mentalmente — barreira real de adoção.

**O que fazer:**
- Backend: campo `unit` livre (string) com lista de sugestões em vez de enum fechado
- Frontend: autocomplete com sugestões (`g`, `kg`, `ml`, `L`, `un`, `cs`, `cx`, `pc`)
- Retrocompatibilidade total com registros existentes

---

### 2. Duplicar Receita

**Problema:** Criar variação de uma receita existente exige redigitar tudo. Quem faz brigadeiro tradicional e de Nutella precisa de duplicação.

**O que fazer:**
- `POST /api/recipes/{id}/duplicate` — clona com sufixo "— Cópia", replica todos os ingredientes
- Botão "Duplicar" na lista e no detalhe da receita

---

### 3. Onboarding para Novos Usuários

**Problema:** Novo usuário vê dashboard vazio sem orientação. Onboarding ruim = abandono na primeira sessão.

**O que fazer:**
- Estado vazio com instrução e CTA nas páginas Ingredientes, Receitas e Produções
- Checklist de primeiros passos no dashboard: "Adicione um ingrediente → Crie uma receita → Registre uma produção"
- Checklist some ao completar as etapas

---

## NEXT — Alto Valor Após o Lançamento

### 4. Catálogo de Produtos

**Descrição:** O confeiteiro compartilha um link com clientes mostrando seus produtos disponíveis, fotos e preços. Cada usuário tem uma página pública em `preciva.com.br/cardapio/{slug}`.

É o feature com maior potencial de crescimento orgânico: cada catálogo compartilhado no WhatsApp e Instagram é um anúncio passivo do Preciva.

**O que fazer:**
- Configuração do catálogo: nome do negócio, descrição, link do WhatsApp, URL personalizada (slug)
- Toggle por receita: "exibir no catálogo" com preço de venda configurável (independente do preço sugerido)
- Página pública responsiva e bonita, sem necessidade de login do cliente
- CTA "Pedir pelo WhatsApp" na página com mensagem pré-preenchida
- Gates de plano: Gratuito (até 3 produtos, selo "Feito com Preciva"), Basic (todos os produtos, link personalizado), Plus (fotos, sem selo)

---

### 5. Foto de Receita

**Descrição:** Upload de imagem para cada receita — essencial para o catálogo, mas com valor standalone (fichas técnicas, organização visual).

**O que fazer:**
- Upload de imagem no formulário de receita (aceitar JPG/PNG, redimensionar no backend)
- Exibição na lista de receitas, detalhe da receita e catálogo público
- Storage local com fallback para placeholder

---

### 6. Simulação de Cenário de Precificação

**Descrição:** "Se eu cobrar 4x em vez de 3x, quanto fica por unidade?" — hoje exige editar e salvar a receita para ver o efeito.

**O que fazer:**
- Slider ou campo inline de multiplicador no detalhe da receita
- Recalculo em tempo real no frontend sem persistir
- Comparação visual entre preço atual e simulado

---

### 7. Histórico de Produção por Receita

**Descrição:** O confeiteiro quer saber: "Quantas vezes produzi esse brigadeiro esse mês e quanto custou no total?" A informação existe mas só está acessível no `/producoes` global.

**O que fazer:**
- Seção "Histórico de Produções" no rodapé do detalhe da receita
- Colunas: Data, Rendimento, Custo Total, Custo Unitário
- Últimos 5 registros com link "Ver todos" para `/producoes` filtrado por receita

---

### 8. Relatório de Lucratividade

**Descrição:** Qual receita tem maior margem? Qual consome mais custo? Essencial para quem quer escalar com inteligência.

**O que fazer:**
- Ranking de receitas por margem de lucro (% e valor absoluto por unidade)
- Destaque para receitas com margem baixa (multiplicador < 2)
- Participação de cada ingrediente no custo total da receita

---

### 9. Alerta de Variação de Preço de Ingrediente

**Descrição:** Quando o preço do chocolate sobe 30%, o confeiteiro precisa saber imediatamente quais receitas foram impactadas e quanto.

**O que fazer:**
- Ao salvar novo preço de ingrediente, mostrar as receitas afetadas com variação de custo (antes vs. depois)
- Sugestão de revisão de preço de venda para receitas com impacto significativo

---

### 10. Busca de Receitas por Ingrediente

**Descrição:** "Quais receitas usam manteiga?" — não tem como saber hoje sem abrir cada uma.

**O que fazer:**
- Filtro por ingrediente na página de Receitas
- Link reverso no detalhe do ingrediente: "Usado em X receitas" com lista

---

### 11. Ficha Técnica em PDF

**Descrição:** Gerar ficha técnica da receita para impressão, arquivo ou compartilhar com equipe de produção.

**O que fazer:**
- `GET /api/recipes/{id}/pdf` com `barryvdh/laravel-dompdf`
- Ficha com: nome, rendimento, lista de ingredientes (quantidades e subtotais), custo de produção, preço sugerido, margem
- Botão "Exportar PDF" no detalhe da receita

---

### 12. Conversão de Unidades

**Descrição:** Ingrediente cadastrado em kg, receita usa gramas — hoje exige conversão manual.

**Depende de:** NOW #1 (Ampliar Unidades)

**O que fazer:**
- Mapa de conversões no backend (g ↔ kg, ml ↔ L)
- Na receita: detectar incompatibilidade de unidade e converter automaticamente
- Bloquear conversões inválidas (ex: g ↔ ml) com mensagem clara

---

## LATER — Expansão Estratégica

### 13. Dashboard de Custos Avançado

Análise histórica de custo de produção com gráficos por semana/mês, ingrediente de maior impacto, evolução de custo de uma receita ao longo do tempo, comparativo entre períodos.

---

### 14. Pedidos via Catálogo

Ao receber interesse pelo catálogo, o confeiteiro registra o pedido no app: receita × quantidade × preço vendido. O sistema fecha o ciclo financeiro mostrando margem real (custo produzido vs. receita de venda).

**Depende de:** NEXT #4 (Catálogo de Produtos)

---

### 15. Controle de Vendas e Faturamento

Registro completo de vendas com cadastro de clientes, relatório de faturamento por período e margem real consolidada. Evolução natural dos pedidos do catálogo.

**Depende de:** LATER #14 (Pedidos via Catálogo)

---

### 16. Notificações por E-mail

Resumo semanal de produções e custos, alerta de ingrediente com variação de preço relevante. Usa sistema de filas já presente (tabela `jobs`).

---

### 17. Importação de Dados via CSV

Migração facilitada para usuários vindos do Excel. Template para download, parser com validação e relatório de erros, importação de ingredientes e receitas.

---

### 18. Histórico de Preços de Ingrediente

Gráfico de evolução do preço de cada ingrediente ao longo do tempo. Útil quando o confeiteiro atualiza preços com frequência e quer entender tendências.

---

### 19. Versionamento de Receitas

Snapshot automático ao editar ingredientes. Comparação entre versões com variação de custo. Restaurar versão anterior.

---

### 20. Multi-usuário / Equipe

Conta com múltiplos usuários e papéis (Admin, Operador, Leitura). Afeta auth em todo o sistema — complexidade alta, implementar por último entre os pré-estoque.

---

### 21. PWA / App Mobile

Instalável na tela inicial. Acesso offline básico para consultar receitas e registrar produções sem internet. Depende de responsividade estável e base de usuários consolidada.

---

### 22. Integração com Nota Fiscal Eletrônica (NF-e)

Importar XML de NF-e para registrar compras de ingredientes automaticamente. Depende de estoque V2.

---

### 23. Marketplace de Receitas

Receitas públicas compartilhadas pela comunidade Preciva. "Usar esta receita" importa para a conta com custo calculado com os preços do próprio usuário. Avaliações e curadoria.

---

### 24. Controle de Estoque e Compras

Removido do MVP por adicionar complexidade desnecessária para o micro confeiteiro. Retorna quando o produto tiver base consolidada e o módulo de vendas/pedidos estiver funcionando.

**Inclui:**
- CRUD de compras com atualização de CMM e histórico de preços
- Ajuste manual de estoque com motivo
- Histórico de movimentações por ingrediente
- Estoque crítico no dashboard
- Desconto automático de estoque ao registrar produção
- Previsão de ruptura com base no histórico de consumo

---

## Resumo

| Prazo | # | Feature | Impacto |
|-------|---|---------|---------|
| **NOW** | 1 | Ampliar Unidades de Medida | Alto |
| **NOW** | 2 | Duplicar Receita | Médio |
| **NOW** | 3 | Onboarding / Estados Vazios | Alto |
| **NEXT** | 4 | Catálogo de Produtos | Alto |
| **NEXT** | 5 | Foto de Receita | Médio |
| **NEXT** | 6 | Simulação de Precificação | Alto |
| **NEXT** | 7 | Histórico de Produção por Receita | Médio |
| **NEXT** | 8 | Relatório de Lucratividade | Alto |
| **NEXT** | 9 | Alerta de Variação de Preço | Médio |
| **NEXT** | 10 | Busca por Ingrediente | Médio |
| **NEXT** | 11 | Ficha Técnica em PDF | Médio |
| **NEXT** | 12 | Conversão de Unidades | Médio |
| **LATER** | 13 | Dashboard de Custos Avançado | Alto |
| **LATER** | 14 | Pedidos via Catálogo | Alto |
| **LATER** | 15 | Controle de Vendas e Faturamento | Alto |
| **LATER** | 16 | Notificações por E-mail | Médio |
| **LATER** | 17 | Importação de Dados via CSV | Médio |
| **LATER** | 18 | Histórico de Preços de Ingrediente | Médio |
| **LATER** | 19 | Versionamento de Receitas | Baixo |
| **LATER** | 20 | Multi-usuário / Equipe | Alto |
| **LATER** | 21 | PWA / App Mobile | Alto |
| **LATER** | 22 | Integração NF-e | Médio |
| **LATER** | 23 | Marketplace de Receitas | Médio |
| **LATER** | 24 | Controle de Estoque e Compras | Alto |

---

## Concluído

| Feature | Observação |
|---------|------------|
| ✅ Sistema de Planos e Assinaturas | Basic e Plus com MercadoPago |
| ✅ Recuperação de Senha | Forgot/reset com e-mail |
| ✅ Módulo de Produções | Registrar, histórico, resumo diário/mensal, snapshot imutável |
| ✅ Gates de Funcionalidade | has_pricing, has_production, limites quantitativos |
| ✅ Upsell Contextual | Blur + olhinho + drawer de planos nas features bloqueadas |
| ✅ Rebrand para Preciva | Logo, nome, identidade visual |

---

*Atualizado: junho/2026*
