# Auditoria Pré-Lançamento — Preciva

> Gerado em junho/2026 via auditoria automatizada de 4 agentes paralelos.
> Cobre: feature gates de plano, consistência de UX, segurança do backend, contrato frontend↔backend.

---

## 🔴 Bloqueadores de Lançamento

### 1. Registro de usuários quebrado
`RegisterRequest` exige `phone` como `required`, mas `AuthService.register` no frontend nunca envia esse campo. **Todo novo cadastro retorna 422.** Prioridade máxima.

**Arquivos:** `app/Http/Requests/Auth/RegisterRequest.php`, `frontend/src/services/AuthService.ts`

---

### 2. `ProductionController` sem gate de `has_production`
Os 4 endpoints (`/productions/summary`, `/productions` GET, `/productions` POST, `/productions/{id}` DELETE) não verificam o plano. Qualquer usuário do plano Gratuito ou Basic acessa o módulo de produções diretamente pela API. A proteção existe apenas no frontend — trivialmente bypassável.

**Arquivo:** `app/Http/Controllers/ProductionController.php`

**Correção:** Adicionar no início de cada método:
```php
$user = $request->user()->load('plan');
if (!$user->plan->has_production) {
    return response()->json([
        'success'    => false,
        'message'    => 'O módulo de produções não está disponível no seu plano.',
        'error_code' => 'PLAN_FEATURE_LOCKED',
    ], 403);
}
```

---

### 3. `Productions.tsx` sem redirect por plano
A rota `/producoes` é acessível diretamente pela URL. O gate do sidebar (que bloqueia a navegação) é o único controle, facilmente contornado digitando a URL diretamente.

**Arquivo:** `frontend/src/pages/Productions.tsx`

**Correção:** Adicionar no início do componente:
```tsx
const hasProd = !!getUser()?.plan.has_production
useEffect(() => {
  if (!hasProd) navigate('/dashboard')
}, [hasProd])
```

---

### 4. `Subscription` — campos do webhook ignorados silenciosamente
`current_period_end` e `cancel_at_period_end` não estão no `$fillable` do model `Subscription`. O `WebhookController` tenta atualizar esses campos via `update()`, mas o Laravel os descarta por mass assignment protection. O status de assinatura pode não ser atualizado corretamente após pagamento ou cancelamento.

**Arquivo:** `app/Models/Subscription.php`

**Correção:** Adicionar `current_period_end` e `cancel_at_period_end` ao `$fillable` e ao `$casts`.

---

### 5. Hard delete de ingrediente causa erro 500 em receitas ativas
`IngredientController::destroy` faz hard delete sem verificar se o ingrediente está em uso em receitas ativas. O `RecipeCostService` vai tentar acessar `ingredient->last_price` e `ingredient->package_size` de um ingrediente deletado e lançar erro 500.

**Arquivo:** `app/Http/Controllers/IngredientController.php`

**Correção:** Antes de deletar, verificar se o ingrediente tem uso em receitas ativas. Se sim, retornar 409 Conflict com mensagem explicativa.

---

## 🟠 Importantes — Corrigir Antes do Lançamento

### 6. `recipe.yield` formatado com `fmtCurrency`
`RecipeDetail.tsx` usa `fmtCurrency(recipe.yield)` para exibir o rendimento. "12 porções" aparece como "12,00 porções". Deve usar `fmtQuantity`.

**Arquivo:** `frontend/src/pages/RecipeDetail.tsx`

---

### 7. Preço dos planos sem centavos no `PlanModal`
`Number(plan.price).toFixed(0)` — R$ 29,90 aparece como "R$ 30/mês". Deve usar `fmtCurrency`.

**Arquivo:** `frontend/src/components/PlanModal.tsx`

---

### 8. `AdminController` sem middleware `auth:sanctum`
A rota `POST admin/users/{userId}/plan` está fora de qualquer grupo de autenticação, protegida apenas por um header `X-Admin-Token` customizado. Se `APP_ADMIN_TOKEN` não estiver configurado no ambiente de produção, a rota pode ficar exposta.

**Arquivo:** `routes/api.php`

---

### 9. Interface `Recipe` incompleta e com campo fantasma
`sale_price` não existe no backend — campo fantasma na interface TypeScript. Outros 9 campos retornados pelo backend estão ausentes da interface (`base_cost`, `cost_per_yield`, `suggested_price_per_yield`, `invisible_cost`, `invisible_cost_pct`, `profit_margin_pct`, `suggested_price`, `active`, timestamps). Campos nullable tipados como `number` (`packaging_cost`, `profit_multiplier`). Isso força `as unknown as` casts inseguros em `Recipes.tsx` e `RecipeDetail.tsx`.

**Arquivo:** `frontend/src/services/RecipeService.ts`

---

### 10. `RecipeIngredient.ingredient_id` não existe no payload do backend
O backend retorna o campo como `id`, não `ingredient_id`. A interface TypeScript está errada.

**Arquivo:** `frontend/src/services/RecipeService.ts`

---

### 11. `destroy()` de `Ingredient` não verifica `active`
`show()` e `update()` verificam `!$ingredient->active`, mas `destroy()` não. Inconsistência que permite deletar ingredientes inativos.

**Arquivo:** `app/Http/Controllers/IngredientController.php`

---

### 12. `destroy()` de `Recipe` não verifica `!$recipe->active`
O mesmo problema — inconsistente com `show()`, `update()` e `duplicate()`.

**Arquivo:** `app/Http/Controllers/RecipeController.php`

---

### 13. Dois `PlanModal` instanciados simultaneamente
`App.tsx` instancia um `PlanModal` global (via event bus `subscribePlanUpgrade`) e `AppHeader.tsx` instancia outro local (via `planModalOpen`). Se `triggerPlanUpgrade()` disparar enquanto o modal do sidebar estiver aberto, dois drawers se sobrepõem.

**Arquivos:** `frontend/src/App.tsx`, `frontend/src/components/AppHeader.tsx`

---

### 14. `ProduceModal` recalcula `unitCost` localmente
`recipe.production_cost / recipe.yield` — duplica lógica do backend e quebra silenciosamente para usuários free (onde `production_cost` é `null`). Deve usar `cost_per_yield` já retornado pelo backend.

**Arquivo:** `frontend/src/components/ProduceModal.tsx`

---

## 🟡 Inconsistências Menores

### 15. `base_cost` vaza custo de embalagem para usuário free
`base_cost = ingredients_cost + packaging_cost` é sempre retornado, mas `packaging_cost` é nulificado para free. O usuário free pode inferir o custo de embalagem via `base_cost - ingredients_cost`.

**Arquivo:** `app/Http/Controllers/RecipeController.php` → `formatRecipe()`

---

### 16. Formulário de edição mostra campos de precificação para usuário free
`InvisibleCostField` e `ProfitMultiplierField` aparecem no modal de edição de receita e no modal de configurações para todos os planos. Usuário free salva valores que não têm efeito visível.

**Arquivos:** `frontend/src/pages/RecipeDetail.tsx`, `frontend/src/components/AppHeader.tsx`

---

### 17. `active` ausente no `$fillable` de `Recipe` e `Ingredient`
Se algum código tentar `Recipe::create(['active' => false])`, o campo é descartado silenciosamente pelo mass assignment protection.

**Arquivos:** `app/Models/Recipe.php`, `app/Models/Ingredient.php`

---

### 18. `StoreProductionRequest` não valida ownership do `recipe_id`
`exists:recipes,id` aceita qualquer UUID de receita de qualquer usuário. A verificação de ownership ocorre depois no controller, mas seria mais seguro adicionar `->where('user_id', $this->user()->id)` direto na regra de validação.

**Arquivo:** `app/Http/Requests/Production/StoreProductionRequest.php`

---

### 19. `RecipeCostService` sem guard para `package_size = 0`
`last_price / package_size` pode causar divisão por zero em registros antigos com `package_size = 0`. A validação atual protege novos cadastros (`min:0.001`), mas não registros existentes.

**Arquivo:** `app/Services/RecipeCostService.php`

---

### 20. `Productions` silencia erro do `getSummary`
`.catch(() => {})` descarta o erro sem nenhum feedback ao usuário. O bloco de resumo simplesmente desaparece.

**Arquivo:** `frontend/src/pages/Productions.tsx`

---

### 21. `UserController::updateSettings` sem gate de `has_pricing`
Usuários free podem persistir `invisible_cost_pct` e `profit_multiplier`. Os valores são salvos mas não têm efeito no que é exibido.

**Arquivo:** `app/Http/Controllers/UserController.php`

---

### 22. `productions_count` retornado no dashboard para todos os planos
Inconsistência semântica — usuário free ou Basic recebe `productions_count` mesmo sem acesso ao módulo.

**Arquivo:** `app/Http/Controllers/DashboardController.php`

---

## 🔵 Melhorias de UX

| # | Arquivo | Item |
|---|---------|------|
| 23 | `RecipeDetail.tsx`, `Recipes.tsx` | Botão "Produzir" sem indicador visual de lock para usuários free — adicionar ícone de cadeado |
| 24 | `frontend/src/store/useAppStore.ts` | Timeout de erro igual ao de sucesso (3s) — erros deveriam durar 5–6s |
| 25 | `frontend/src/components/AppHeader.tsx` | `<a href>` em vez de `<Link>` — causa full reload no clique do meio do mouse |
| 26 | `frontend/src/pages/Register.tsx` | Redireciona para `/dashboard` em vez de `/verify-email` — redirect em cadeia desnecessário |
| 27 | `frontend/src/components/AppHeader.tsx` | Sidebar não fecha com tecla Escape |
| 28 | `frontend/src/pages/Dashboard.tsx` | Sem stat-card de Produções para usuários pagos |
| 29 | `frontend/src/pages/Dashboard.tsx` | Step "Registre uma produção" navega para `/recipes` — texto e destino confusos |
| 30 | `frontend/src/pages/RecipeDetail.tsx` | Mensagem "Receita não encontrada" para qualquer erro de rede — imprecisa |
| 31 | `app/Http/Controllers/ProductionController.php` | `index()` sem `per_page` parametrizável — fixo em 20, inconsistente com outros controllers |
| 32 | `app/Models/User.php` | `remember_token` não está em `$hidden` |
| 33 | `app/Services/RecipeCostService.php` | `total_cost` semanticamente confuso — é na verdade `base_cost` (sem custos invisíveis) |
| 34 | `app/Http/Controllers/SubscriptionController.php` | `store()` usa `$request->validate()` inline — inconsistente com o padrão Form Request do projeto |

---

## Resumo por Prioridade

| Prioridade | Qtd | Itens |
|---|---|---|
| 🔴 Bloqueador | 5 | #1 ao #5 |
| 🟠 Importante | 9 | #6 ao #14 |
| 🟡 Inconsistência | 8 | #15 ao #22 |
| 🔵 Melhoria | 12 | #23 ao #34 |

---

## Status de Resolução

| # | Descrição | Status |
|---|-----------|--------|
| 1 | Registro quebrado (`phone` required) | ✅ Resolvido |
| 2 | ProductionController sem gate `has_production` | ✅ Resolvido (middleware `plan.feature`) |
| 3 | Productions.tsx sem redirect por plano | ✅ Resolvido |
| 4 | Subscription `$fillable` faltando campos do webhook | ✅ Resolvido |
| 5 | Hard delete de ingrediente quebra receitas | ✅ Resolvido |
| 6 | `recipe.yield` com `fmtCurrency` | ✅ Resolvido |
| 7 | Preço do plano sem centavos | ✅ Resolvido |
| 8 | AdminController sem `auth:sanctum` | ✅ Resolvido (middleware `admin.token`) |
| 9 | Interface `Recipe` incompleta | ✅ Resolvido |
| 10 | `RecipeIngredient.ingredient_id` fantasma | ✅ Resolvido |
| 11 | `destroy()` Ingredient sem verificar `active` | ✅ Resolvido |
| 12 | `destroy()` Recipe sem verificar `active` | ✅ Resolvido |
| 13 | Dois PlanModal simultâneos | ✅ Resolvido |
| 14 | ProduceModal recalcula unitCost localmente | ✅ Resolvido |
| 15 | `base_cost` vazando para free | ✅ Resolvido (packaging_cost liberado para todos; base_cost removido) |
| 16 | Campos de precificação visíveis para free | ✅ Resolvido (locked com upsell em RecipeDetail e AppHeader) |
| 17 | `active` ausente no `$fillable` | ✅ Resolvido |
| 18 | `StoreProductionRequest` sem ownership do `recipe_id` | ✅ Resolvido (authorizeProduction no controller) |
| 19 | `RecipeCostService` sem guard `package_size = 0` | ✅ Resolvido |
| 20 | `Productions` silencia erro do `getSummary` | ✅ Resolvido (feedback de erro + hifens no lugar dos valores) |
| 21 | `updateSettings` sem gate `has_pricing` | ✅ Resolvido |
| 22 | `productions_count` para todos os planos | ✅ Resolvido (null para planos sem has_production) |
| 23 | Botão Produzir sem indicador visual de lock | ✅ Resolvido (🔒 Produzir para free) |
| 24 | Timeout de erro muito curto (3s) | ✅ Resolvido (5000ms) |
| 25 | `<a href>` em vez de `<Link>` no AppHeader | ✅ Resolvido |
| 26 | Register redireciona para `/dashboard` | ✅ Resolvido (+ fix: verificação atualiza localStorage sem novo login) |
| 27 | Sidebar não fecha com Escape | ✅ Resolvido |
| 28 | Dashboard sem stat-card de Produções | ✅ Resolvido |
| 29 | Step de produção navega para `/recipes` | ✅ Resolvido (/producoes) |
| 30 | Mensagem de erro genérica no RecipeDetail | ✅ Resolvido |
| 31 | Productions sem `per_page` parametrizável | ✅ Resolvido |
| 32 | `remember_token` fora do `$hidden` | ✅ Resolvido |
| 33 | `total_cost` semanticamente confuso | ✅ Resolvido (renomeado para `base_cost` em toda a stack) |
| 34 | `SubscriptionController::store` sem Form Request | ✅ Resolvido |
