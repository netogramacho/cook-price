<?php

namespace Database\Seeders;

use App\Models\Ingredient;
use App\Models\Plan;
use App\Models\Recipe;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TestUsersSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedUser(
            name:            'Usuário Gratuito',
            email:           'free@cookprice.test',
            phone:           '11911110001',
            planName:        'free',
            totalIngredients: 18, // 15 ativos + 3 inativos (overflow)
            totalRecipes:     5,  // 3 ativas + 2 inativas (overflow)
        );

        $this->seedUser(
            name:            'Usuário Básico',
            email:           'basic@cookprice.test',
            phone:           '11911110002',
            planName:        'basic',
            totalIngredients: 60,
            totalRecipes:     15,
        );

        $this->seedUser(
            name:            'Usuário Pro',
            email:           'pro@cookprice.test',
            phone:           '11911110003',
            planName:        'pro',
            totalIngredients: 25,
            totalRecipes:     8,
        );
    }

    private function seedUser(
        string $name,
        string $email,
        string $phone,
        string $planName,
        int $totalIngredients,
        int $totalRecipes,
    ): void {
        $plan = Plan::where('name', $planName)->firstOrFail();

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name'              => $name,
                'phone'             => $phone,
                'password'          => 'password',
                'plan_id'           => $plan->id,
                'email_verified_at' => now(),
            ]
        );

        // Evita recriar dados se o seeder rodar novamente
        if (!$user->wasRecentlyCreated) {
            $this->command->info("Usuário {$email} já existe — pulando.");
            return;
        }

        $this->createIngredients($user, $totalIngredients, $plan->max_ingredients);
        $this->createRecipes($user, $totalRecipes, $plan->max_recipes);

        $this->command->info("Criado: {$email} ({$plan->label}) — {$totalIngredients} ingredientes, {$totalRecipes} receitas.");
    }

    private function createIngredients(User $user, int $total, ?int $activeLimit): void
    {
        $names = [
            'Farinha de trigo', 'Açúcar refinado', 'Ovos', 'Manteiga', 'Leite integral',
            'Fermento biológico', 'Sal refinado', 'Óleo de soja', 'Chocolate em pó',
            'Creme de leite', 'Leite condensado', 'Glucose de milho', 'Cacau em pó',
            'Amido de milho', 'Baunilha', 'Embalagem caixa 500g', 'Embalagem saco 1kg',
            'Embalagem pote 250ml', 'Embalagem bandeja', 'Embalagem papel manteiga',
            'Canela em pó', 'Cravo', 'Noz moscada', 'Essência de laranja',
            'Coco ralado', 'Amendoim', 'Castanha de caju', 'Nozes',
            'Uva passa', 'Cereja em calda', 'Morango', 'Limão',
            'Laranja', 'Maçã', 'Banana', 'Abacaxi',
            'Mandioca', 'Batata doce', 'Abóbora', 'Cenoura',
            'Beterraba', 'Espinafre', 'Couve', 'Rúcula',
            'Alface', 'Tomate', 'Cebola', 'Alho',
            'Gengibre', 'Manjericão', 'Alecrim', 'Tomilho',
            'Orégano', 'Pimenta do reino', 'Páprica', 'Cúrcuma',
            'Queijo mussarela', 'Queijo parmesão', 'Requeijão', 'Cream cheese',
            'Peito de frango', 'Carne moída', 'Bacon', 'Calabresa',
        ];

        $units        = ['g', 'g', 'g', 'ml', 'un'];
        $packageSizes = [500, 1000, 5000, 1000, 100, 200, 250];

        for ($i = 0; $i < $total; $i++) {
            $name = $names[$i] ?? "Ingrediente " . ($i + 1);
            $isPackaging = str_contains(strtolower($name), 'embalagem');

            Ingredient::create([
                'user_id'       => $user->id,
                'name'          => $name,
                'type'          => $isPackaging ? 'packaging' : 'ingredient',
                'unit'          => $units[$i % count($units)],
                'package_size'  => $packageSizes[$i % count($packageSizes)],
                'last_price'    => round(rand(150, 4500) / 100, 2),
                'stock_quantity' => round(rand(0, 5000) / 10, 3),
                'min_stock'     => round(rand(100, 500) / 10, 3),
            ]);
        }

        // Desativar overflow — manter ativos apenas os mais antigos até o limite
        if ($activeLimit !== null && $total > $activeLimit) {
            $keepIds = Ingredient::where('user_id', $user->id)
                ->oldest()
                ->limit($activeLimit)
                ->pluck('id');

            Ingredient::where('user_id', $user->id)
                ->whereNotIn('id', $keepIds)
                ->update(['active' => false]);
        }
    }

    private function createRecipes(User $user, int $total, ?int $activeLimit): void
    {
        $names = [
            'Bolo de chocolate', 'Pão de queijo', 'Brigadeiro', 'Quindim',
            'Coxinha', 'Esfirra', 'Pizza margherita', 'Lasanha bolonhesa',
            'Torta de limão', 'Cheesecake', 'Pavê de chocolate', 'Mousse de maracujá',
            'Brownie', 'Muffin de banana', 'Cookie de aveia', 'Cupcake de baunilha',
        ];

        $ingredients = Ingredient::where('user_id', $user->id)
            ->where('active', true)
            ->limit(6)
            ->get();

        for ($i = 0; $i < $total; $i++) {
            $name = $names[$i] ?? "Receita " . ($i + 1);

            $recipe = Recipe::create([
                'user_id'            => $user->id,
                'name'               => $name,
                'description'        => "Descrição da {$name}",
                'yield'              => rand(10, 50),
                'yield_unit'         => 'un',
                'invisible_cost_pct' => 25,
                'profit_multiplier'  => 3,
            ]);

            // Vincular 2 a 4 ingredientes por receita
            if ($ingredients->isNotEmpty()) {
                $count    = min(rand(2, 4), $ingredients->count());
                $selected = $ingredients->random($count);
                $syncData = [];
                foreach ($selected as $ingredient) {
                    $syncData[$ingredient->id] = ['quantity' => round(rand(10, 500) / 10, 3)];
                }
                $recipe->ingredients()->sync($syncData);
            }
        }

        // Desativar overflow — manter ativas apenas as mais antigas até o limite
        if ($activeLimit !== null && $total > $activeLimit) {
            $keepIds = Recipe::where('user_id', $user->id)
                ->oldest()
                ->limit($activeLimit)
                ->pluck('id');

            Recipe::where('user_id', $user->id)
                ->whereNotIn('id', $keepIds)
                ->update(['active' => false]);
        }
    }
}
