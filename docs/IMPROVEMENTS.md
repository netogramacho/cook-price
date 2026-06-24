# CookPrice — Backlog de Melhorias

Documento gerado em 2026-06-17 com mapeamento técnico de cada item do backlog.
Itens ordenados por prioridade: 🔴 Alta → 🟡 Média → 🟠 Baixa.

---

## 🔴 Prioridade Alta

---

### 1. Ajustar input tamanho do pacote ("1.0000")

**Contexto:** Ao editar um ingrediente existente, o campo "Tamanho do pacote" exibe `"1.0000"` em vez de `"1"`.

**Arquivo:** `frontend/src/pages/Ingredients.tsx` — linha 76

**Causa raiz:**
```tsx
// Linha 76 — ao popular o form de edição:
package_size: String(ingredient.package_size)
// A API retorna package_size como decimal com 4 casas: "1.0000"
// String() preserva o valor exato, gerando "1.0000" no input
```

O campo na migration é `decimal(10, 4)` com default `1`, então a API serializa como `1.0000`. O formatter `fmtQuantity()` já existe em `frontend/src/utils/formatters.ts` (linha 9) e é usado corretamente na tabela (linha 131), mas não na linha 76.

**Correção:**
```tsx
// Linha 76 — substituir:
package_size: String(ingredient.package_size)
// por:
package_size: parseFloat(String(ingredient.package_size)).toString()
// ou usar o parseDecimal existente em utils/inputs.ts
```

---

### 2. Observação da produção nunca é exibida

**Contexto:** O campo `notes` (Observações) existe no banco, é capturado no formulário de produção, salvo e retornado pela API — mas nunca é exibido na listagem de produções.

**Arquivos envolvidos:**
- `frontend/src/components/ProduceModal.tsx` — captura `notes` no input (linhas 79-88) ✅
- `frontend/src/pages/Productions.tsx` — tabela de produções (linhas 109-122) — **não exibe notes** ❌
- `app/Models/Production.php` — campo `notes` no fillable ✅
- `frontend/src/services/ProductionService.ts` — interface inclui `notes: string | null` (linha 43) ✅
- `database/migrations/2026_06_16_120000_create_productions_table.php` — coluna `notes VARCHAR(500) NULLABLE` (linha 19) ✅

**Dado flui corretamente até o frontend, mas não é renderizado.**

**O que fazer:**
- Na tabela de produções (`Productions.tsx`), exibir `notes` como linha secundária abaixo do nome da receita em cada row (não exige nova coluna)
- Se houver notes, mostrar ícone de nota; ao hover, exibir o texto completo em tooltip

---

### 3. Produção total não atualiza ao excluir

**Contexto:** O contador de produções totais (exibido no Dashboard) não é recalculado após excluir uma produção na tela de produções.

**Arquivos envolvidos:**
- `frontend/src/pages/Productions.tsx` — lógica de delete e atualização (linha 41)
- `frontend/src/pages/Dashboard.tsx` — exibe `productions_count` (linha 52)
- `app/Http/Controllers/DashboardController.php` — calcula `productions_count` (linhas 19-21)
- `frontend/src/services/ProductionService.ts` — `delete(id)` (linhas 66-68)

**Estado atual:**
- A lista de produções faz decremento manual no frontend após delete (linha 41 de Productions.tsx)
- O contador do Dashboard (`productions_count`) é buscado separadamente via `/dashboard`
- Após deletar em `/productions`, o Dashboard não é notificado e continua mostrando o valor antigo

**O que fazer:**
- **Opção A (simples):** Após delete bem-sucedido em `Productions.tsx`, chamar `DashboardService.get()` novamente para atualizar o estado do Dashboard
- **Opção B (reativa):** Usar um estado global (Context ou Zustand) para `productions_count` que é atualizado em qualquer delete
- Recomendação: Opção A é a mais rápida e suficiente para o MVP

---

## 🟡 Prioridade Média

---

### 4. Todos os inputs — primeira letra maiúscula

**Contexto:** Os placeholders de texto livre estão inconsistentes entre maiúsculo e minúsculo.

**Arquivos envolvidos:**
- `frontend/src/pages/Recipes.tsx` — placeholder `"porções"` (linha ~242) está em minúsculo
- `frontend/src/pages/Ingredients.tsx` — placeholders dos campos de formulário
- `frontend/src/components/QuickIngredientModal.tsx` — placeholders

**Estado atual (inconsistências identificadas):**
| Campo | Placeholder atual | Correto |
|---|---|---|
| Unidade da receita | `"porções"` | `"Porções"` |

**O que fazer:**
- Auditar todos os `placeholder=` nos arquivos TSX e garantir que textos descritivos começam com maiúscula
- Regra: exemplos com prefixo `"Ex:"` já estão corretos; textos instrucionais devem ter primeira letra maiúscula

---

### 5. Adaptar placeholders de embalagens para embalagens

**Contexto:** O formulário de ingredientes usa o mesmo placeholder genérico para ingredientes e embalagens. Quando o tipo selecionado é "packaging", os textos de exemplo deveriam refletir embalagens.

**Arquivos envolvidos:**
- `frontend/src/pages/Ingredients.tsx` — formulário principal (placeholder na linha ~179)
- `frontend/src/components/QuickIngredientModal.tsx` — modal rápido (linha ~92)

**Estado atual:**
- Placeholder do nome: `"Ex: Farinha de trigo"` — serve para ingrediente, mas não para embalagem
- Placeholder do tamanho do pacote: `"Ex: 500"` — genérico para os dois tipos

**O que fazer:**
- Tornar os placeholders reativos ao `form.type` selecionado:
  - Tipo `ingredient`: `"Ex: Farinha de trigo"`, tamanho: `"Ex: 1000 (g)"`
  - Tipo `packaging`: `"Ex: Caixa kraft 500g"`, tamanho: `"Ex: 1 (un)"`
- Aplicar tanto em `Ingredients.tsx` quanto em `QuickIngredientModal.tsx`

---

### 6. Remover unidades não usadas em embalagens

**Contexto:** As unidades de medida disponíveis (`g`, `ml`, `un`) foram pensadas para ingredientes. Para embalagens, `g` e `ml` raramente fazem sentido — embalagens são quase sempre `un` (unidade).

**Arquivos envolvidos:**
- `frontend/src/pages/Ingredients.tsx` — select de unidade (linhas 172-176)
- `frontend/src/components/QuickIngredientModal.tsx` — select de unidade (linhas 84-89)
- `app/Http/Requests/Ingredient/StoreIngredientRequest.php` — validação `Rule::in(['g', 'ml', 'un'])` (linha 26)
- `app/Http/Requests/Ingredient/UpdateIngredientRequest.php` — mesma validação (linha 28)

**Estado atual:**
- Ambos os formulários oferecem `g`, `ml`, `un` independentemente do tipo

**O que fazer:**
- Filtrar as opções do select com base no `form.type`:
  - Tipo `ingredient`: mostrar `g`, `ml`, `un`
  - Tipo `packaging`: mostrar apenas `un` (e pré-selecionar automaticamente)
- Não é necessário alterar a validação backend por ora, já que `un` é um valor válido existente

---

### 7. Adicionar helper no custo invisível

**Contexto:** O campo "Custos Invisíveis (%)" não explica ao usuário o que são esses custos ou como o percentual é aplicado.

**Arquivo:** `frontend/src/components/ui/InvisibleCostField.tsx` (linhas 1-27)

**Estado atual:** Campo com label "Custos Invisíveis (%)" e input numérico, sem tooltip ou explicação.

**O que fazer:**
- Adicionar ícone de interrogação `?` ao lado do label
- Ao hover/click, exibir tooltip ou popover com:
  > "Custos indiretos que não aparecem nos ingredientes, como gás, energia, água e mão de obra. Ex: 15% significa que 15% do custo dos ingredientes é somado como custo operacional."
- Também mostrar o valor calculado em reais: `"= R$ X,XX sobre o custo base"`

---

### 8. Usuário sem plano não salva custo invisível nem margem

**Contexto:** Usuários do plano Free conseguem digitar valores nos campos de custo invisível e multiplicador de lucro, mas ao salvar a receita os valores são ignorados pelo backend (ou deveriam ser).

**Arquivos envolvidos:**
- `app/Http/Controllers/RecipeController.php` — verificação `$has_pricing` (linhas 33-44)
- `app/Http/Controllers/UserController.php` — `requiresPricing()` (linhas 37-62)
- `frontend/src/components/ui/InvisibleCostField.tsx` — campo de custo invisível
- `frontend/src/components/ui/ProfitMultiplierField.tsx` — slider de multiplicador
- `frontend/src/pages/Recipes.tsx` — form da receita

**O que fazer:**
- Garantir no `StoreRecipeRequest` / `UpdateRecipeRequest` que `invisible_cost_pct` e `profit_multiplier` são ignorados se `!$user->plan->has_pricing`
- No frontend: tornar os campos `disabled` (não apenas visualmente bloqueados) quando `!has_pricing`, impedindo que o valor seja enviado no payload
- Adicionar feedback claro: "Disponível no plano Basic ou superior" com CTA de upgrade

---

### 9. Melhorar intuição do cadastro de receita — "Rendimento × Unidade"

**Contexto:** Os campos `Rendimento` e `Unidade` são apresentados lado a lado sem deixar claro que formam um conceito único ("10 porções"). Usuários não entendem de imediato a relação entre eles.

**Arquivos envolvidos:**
- `frontend/src/pages/Recipes.tsx` — form-row com os dois campos (linhas ~237-243)
- `app/Http/Requests/Recipe/StoreRecipeRequest.php` — validação `yield` e `yield_unit` (linhas 27-28)
- `database/migrations/2026_04_27_100000_create_recipes_table.php` — colunas `yield` e `yield_unit` (linhas 16-17)

**Estado atual:**
```tsx
<div className="form-row">
  <FormField label="Rendimento">
    <NumericInput placeholder="10" ... />
  </FormField>
  <FormField label="Unidade">
    <input type="text" placeholder="porções" ... />
  </FormField>
</div>
```

**Problemas:**
- Não há label agrupador explicando "Rendimento = quantidade × unidade"
- `yield_unit` é texto livre — usuários digitam coisas inconsistentes ("porção", "porções", "Porções", "und")
- Não há hint text mostrando o resultado combinado em tempo real

**O que fazer:**
- Adicionar label-grupo acima do form-row: `"Rendimento da receita"`
- Adicionar hint abaixo do row mostrando a combinação: `"Esta receita rende {yield} {yield_unit}"`
- Opcionalmente: transformar `yield_unit` em select com opções pré-definidas (`Porções`, `Unidades`, `kg`, `g`, `L`) + opção "Outro (digitar)"

---

### 10. Adicionar configurações no onboarding

**Contexto:** O onboarding atual é um checklist pós-login no Dashboard (cadastrar ingrediente → criar receita → registrar produção). Não há etapa de configuração inicial de parâmetros de precificação.

**Arquivos envolvidos:**
- `frontend/src/pages/Dashboard.tsx` — checklist (linhas 59-100)
- `frontend/src/components/AppHeader.tsx` — modal de configurações atual (linhas 182-205)
- `app/Http/Controllers/UserController.php` — `updateSettings()` (linhas 37-50)
- `app/Models/User.php` — campos `invisible_cost_pct`, `profit_multiplier`, `disable_stock_control` (linhas 25-34)

**Estado atual:**
- Configurações ficam escondidas num modal acessível pelo header
- Novos usuários nunca são direcionados às configurações durante o onboarding
- `disable_stock_control` existe no banco mas não é exposto na UI de configurações

**O que fazer:**
- Adicionar etapa no onboarding para usuários com plano Basic/Pro:
  > "Configure seus padrões de precificação" (custo invisível padrão + multiplicador de lucro)
- Para usuários Free: mostrar a etapa como locked com CTA de upgrade
- Expor `disable_stock_control` na tela de configurações (AppHeader modal)

---

## 🟠 Prioridade Baixa

---

### 11. Melhorar dinâmica de unidades de medida dos ingredientes

**Contexto:** As unidades `g`, `ml`, `un` são hardcoded em dois lugares do frontend com formatações ligeiramente diferentes, e não existe suporte a `kg` ou `L`.

**Arquivos envolvidos:**
- `frontend/src/pages/Ingredients.tsx` — select com `"g — Grama"` (linhas 172-176)
- `frontend/src/components/QuickIngredientModal.tsx` — select com `"g (gramas)"` (linhas 84-89)
- `app/Http/Requests/Ingredient/StoreIngredientRequest.php` — `Rule::in(['g', 'ml', 'un'])` (linha 26)
- `app/Http/Requests/Ingredient/UpdateIngredientRequest.php` — mesma validação (linha 28)
- `app/Services/RecipeCostService.php` — cálculo `price_per_unit = last_price / package_size` (linhas 12-14)

**Problemas identificados:**
1. Duas formatações diferentes: `"g — Grama"` vs `"g (gramas)"`
2. Não há `kg` ou `L` como unidades disponíveis (usuário compra 1kg mas precisa cadastrar 1000g)
3. Sem conversão automática de unidade ao adicionar ingrediente à receita

**O que fazer (abordagem incremental):**
- **Curto prazo:** Unificar a formatação das opções nos dois selects
- **Curto prazo:** Adicionar `kg` e `L` como unidades opcionais com conversão implícita (1kg = 1000g, 1L = 1000ml)
  - Backend: adicionar `'kg'` e `'L'` no `Rule::in()`
  - `RecipeCostService`: normalizar unidades antes de calcular (`kg → g`, `L → ml`)

---

### 12. Soft delete em produções + repensar o modelo de produções

**Contexto:** Produções atualmente são hard-deleted. Além disso, o módulo é tratado apenas como histórico, sem distinção entre produções canceladas e erros de cadastro.

**Arquivos envolvidos:**
- `app/Models/Production.php` — sem `SoftDeletes` trait
- `app/Http/Controllers/ProductionController.php` — `destroy()` usa hard delete (linha 132)
- `database/migrations/2026_06_16_120000_create_productions_table.php` — sem coluna `deleted_at`
- `routes/api.php` — rotas de produção (linhas 49-54)

**Estado atual:**
- Deleção permanente — sem possibilidade de recuperação
- Sem distinção entre produções canceladas, erros de cadastro e produções reais

**O que fazer:**

**Curto prazo (soft delete):**
1. Migration: `ALTER TABLE productions ADD deleted_at TIMESTAMP NULL`
2. Adicionar `use SoftDeletes;` em `Production.php`
3. `$production->delete()` passa a fazer soft delete automaticamente

**Médio prazo (repensar o modelo):**
- Adicionar `status` na produção: `'completed'`, `'cancelled'`, `'draft'`
- Ao "excluir", perguntar: "Esta produção foi cancelada ou foi um erro de cadastro?"
  - "Cancelada" → soft delete com status `cancelled` (mantém no histórico)
  - "Erro" → soft delete com flag `is_error: true` (excluído do histórico)

---

### 13. Estratégia para liberar todas as features por 1 semana

**Contexto:** Ideia de oferecer trial gratuito de 7 dias com acesso a todas as funcionalidades Pro para novos usuários ou para campanha.

**Arquivos envolvidos:**
- `app/Models/User.php` — campo `plan_id` (linha 30)
- `app/Models/Plan.php` — flags `has_pricing`, `has_production`, limites de receitas/ingredientes
- `app/Http/Middleware/RequiresPlanFeature.php` — gating de features (linhas 1-24)
- `app/Http/Controllers/RecipeController.php` — `checkRecipeLimit()` (linhas 184-197)
- `database/migrations/2026_06_04_300000_create_plans_table.php` — definição dos planos

**Mapa atual de restrições:**
| Feature | Free | Basic | Pro |
|---|---|---|---|
| Receitas | até 3 | até 15 | ilimitado |
| Ingredientes | até 15 | até 60 | ilimitado |
| Custos invisíveis | 🔒 | ✅ | ✅ |
| Preço sugerido & margem | 🔒 | ✅ | ✅ |
| Produções | 🔒 | 🔒 | ✅ |

**Estratégia recomendada — adicionar campo `trial_ends_at` no usuário:**
1. Migration: `ALTER TABLE users ADD trial_ends_at TIMESTAMP NULL`
2. No middleware `RequiresPlanFeature`, verificar antes do check de plano:
   ```php
   if ($user->trial_ends_at && $user->trial_ends_at > now()) {
       return $next($request); // trata como Pro durante trial
   }
   ```
3. Em `RecipeController::checkRecipeLimit()`, idem: pular o limite se trial ativo
4. Ao criar usuário, opcionalmente já setar `trial_ends_at = now()->addDays(7)`
5. Frontend: exibir banner "Trial Pro — X dias restantes" quando `trial_ends_at` estiver ativo

**Por que esta estratégia:** não muda o plano real do usuário, é reversível, não interfere no sistema de assinatura MercadoPago existente.

---

## TODO

- [x] 1. Ajustar input tamanho do pacote ("1.0000")
- [x] 2. Observação da produção nunca é exibida
- [x] 3. Produção total não atualiza ao excluir
- [x] 4. Todos os inputs — primeira letra maiúscula
- [x] 5. Adaptar placeholders de embalagens para embalagens
- [x] 6. Remover unidades não usadas em embalagens
- [x] 7. Adicionar helper no custo invisível
- [x] 8. Usuário sem plano não salva custo invisível nem margem
- [ ] 9. Melhorar intuição do cadastro de receita — "Rendimento × Unidade"
- [x] 10. Adicionar configurações no onboarding (onboarding persistido no banco — base extensível)
- [x] 11. Melhorar dinâmica de unidades de medida dos ingredientes (kg/L + conversão por família, unidade por linha na receita)
- [x] 12. Soft delete em produções + repensar o modelo de produções
- [x] 13. Estratégia para liberar todas as features por 1 semana (plano "Experimentação" + subscription D+7, rebaixado pelo ExpireSubscriptions)
