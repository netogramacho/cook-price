# CookPrice — Implementação dos Planos (DB)

## Decisão de Arquitetura

Os limites e permissões de cada plano são armazenados no banco de dados, não em arquivos de configuração. Isso permite alterar limites, criar promoções ou planos customizados sem necessidade de deploy.

---

## Schema

### Tabela `plans`

```sql
plans
├── id                  uuid, PK
├── name                string(50)   -- identificador interno: 'free', 'basic', 'pro'
├── label               string(100)  -- nome exibido ao usuário: 'Gratuito', 'Básico', 'Pro'
├── price               decimal(8,2) -- 0, 19, 39
├── max_recipes         int nullable -- null = ilimitado
├── max_ingredients     int nullable
├── has_pricing         boolean      -- preço sugerido, margem, custos invisíveis e embalagem
├── has_stock           boolean      -- acesso ao módulo de estoque e compras
├── has_stock_history   boolean      -- histórico de movimentações
├── has_production      boolean      -- produção de receitas (desconto de estoque)
├── created_at          timestamp
└── updated_at          timestamp
```

### Alteração em `users`

Adicionar FK para o plano atual do usuário:

```sql
users
└── plan_id  uuid, FK → plans.id
```

---

## Seeder — Dados Iniciais

```php
// database/seeders/PlanSeeder.php

Plan::insert([
    [
        'name'               => 'free',
        'label'              => 'Gratuito',
        'price'              => 0,
        'max_recipes'        => 3,
        'max_ingredients'    => 15,
        'has_pricing'        => false,
        'has_stock'          => false,
        'has_stock_history'  => false,
        'has_production'     => false,
    ],
    [
        'name'               => 'basic',
        'label'              => 'Básico',
        'price'              => 19,
        'max_recipes'        => 15,
        'max_ingredients'    => 60,
        'has_pricing'        => true,
        'has_stock'          => true,
        'has_stock_history'  => false,
        'has_production'     => false,
    ],
    [
        'name'               => 'pro',
        'label'              => 'Pro',
        'price'              => 39,
        'max_recipes'        => null,
        'max_ingredients'    => null,
        'has_pricing'        => true,
        'has_stock'          => true,
        'has_stock_history'  => true,
        'has_production'     => true,
    ],
]);
```

---

## Model `Plan`

```php
// app/Models/Plan.php

class Plan extends Model
{
    use HasUuids;

    protected $casts = [
        'price'             => 'decimal:2',
        'has_pricing'       => 'boolean',
        'has_stock'         => 'boolean',
        'has_stock_history' => 'boolean',
        'has_production'    => 'boolean',
    ];

    public function isUnlimited(string $feature): bool
    {
        return is_null($this->{"max_{$feature}"});
    }
}
```

---

## Model `User` — Relacionamento

```php
// app/Models/User.php

public function plan(): BelongsTo
{
    return $this->belongsTo(Plan::class);
}
```

Usar eager loading onde necessário para evitar N+1:

```php
$user = $request->user()->load('plan');
```

---

## Onde Aplicar os Gates

### 1. Limites quantitativos (receitas e ingredientes)

Verificar antes de criar o recurso, no `store()` do controller:

```php
// RecipeController::store()
$plan = $request->user()->plan;

if ($plan->max_recipes !== null) {
    $count = Recipe::where('user_id', $request->user()->id)->count();
    if ($count >= $plan->max_recipes) {
        return response()->json([
            'success'    => false,
            'message'    => "Seu plano permite no máximo {$plan->max_recipes} receitas.",
            'error_code' => 'PLAN_LIMIT_REACHED',
        ], 403);
    }
}
```

O mesmo padrão se aplica em `IngredientController::store()` com `max_ingredients`.

### 2. Módulo de estoque e compras

Gates no início dos métodos dos controllers `StockController`, `PurchaseController` e `StockMovementController::adjust()`:

```php
if (!$request->user()->plan->has_stock) {
    return response()->json([
        'success'    => false,
        'message'    => 'Seu plano não inclui controle de estoque.',
        'error_code' => 'PLAN_FEATURE_UNAVAILABLE',
    ], 403);
}
```

### 3. Histórico de movimentações

Gate em `StockMovementController::index()`:

```php
if (!$request->user()->plan->has_stock_history) {
    return response()->json([
        'success'    => false,
        'message'    => 'Seu plano não inclui histórico de movimentações.',
        'error_code' => 'PLAN_FEATURE_UNAVAILABLE',
    ], 403);
}
```

### 4. Produção de receitas

Gate em `RecipeController::produce()`:

```php
if (!$request->user()->plan->has_production) {
    return response()->json([
        'success'    => false,
        'message'    => 'Seu plano não inclui registro de produção.',
        'error_code' => 'PLAN_FEATURE_UNAVAILABLE',
    ], 403);
}
```

### 5. Preço sugerido e custos avançados

Este gate age na **resposta**, não no acesso. Em `RecipeCostService` ou em `RecipeController::formatRecipe()`, retornar `null` nos campos de precificação quando o plano não permite:

```php
// Campos zerados/nulos para planos sem has_pricing
'invisible_cost_pct'        => $has_pricing ? $cost['invisible_cost_pct']        : null,
'invisible_cost'            => $has_pricing ? $cost['invisible_cost']            : null,
'packaging_cost'            => $has_pricing ? $cost['packaging_cost']            : null,
'profit_multiplier'         => $has_pricing ? $cost['profit_multiplier']         : null,
'profit_margin_pct'         => $has_pricing ? $cost['profit_margin_pct']         : null,
'suggested_price'           => $has_pricing ? $cost['suggested_price']           : null,
'suggested_price_per_yield' => $has_pricing ? $cost['suggested_price_per_yield'] : null,
```

---

## Plano Padrão para Novos Usuários

No `AuthController::register()`, após criar o usuário, atribuir o plano gratuito:

```php
$free_plan = Plan::where('name', 'free')->first();
$user->plan_id = $free_plan->id;
$user->save();
```

---

## Expor Plano na API

Incluir dados do plano na resposta de `GET /user` para que o frontend saiba quais features exibir/bloquear:

```php
// UserController::show()
$user->load('plan');

return response()->json([
    'success' => true,
    'data'    => [
        'id'    => $user->id,
        'name'  => $user->name,
        'email' => $user->email,
        'plan'  => $user->plan,
    ],
]);
```

---

## Ordem de Implementação Sugerida

1. Migration da tabela `plans`
2. Adicionar coluna `plan_id` em `users`
3. Model `Plan` + relacionamento em `User`
4. Seeder com os 3 planos
5. Atribuir plano gratuito no registro
6. Gate de limite em `RecipeController::store()`
7. Gate de limite em `IngredientController::store()`
8. Gates de feature nos demais controllers
9. Gate de precificação no `formatRecipe()`
10. Expor `plan` em `GET /user`
