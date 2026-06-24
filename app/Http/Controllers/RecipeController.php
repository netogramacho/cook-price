<?php

namespace App\Http\Controllers;

use App\Http\Requests\Recipe\StoreRecipeRequest;
use App\Http\Requests\Recipe\UpdateRecipeRequest;
use App\Models\Recipe;
use App\Models\User;
use App\Services\RecipeCostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RecipeController extends Controller
{
    public function __construct(
        private RecipeCostService $cost_service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $per_page = min((int) $request->get('per_page', 15), 100);
        $search   = $request->get('search', '');
        $user     = $request->user()->load('plan');
        $plan     = $user->plan;

        $recipes = Recipe::where('user_id', $user->id)
            ->where('active', true)
            ->with('ingredients')
            ->when($search, fn ($q) => $q->where('name', 'like', '%' . $search . '%'))
            ->orderBy('name')
            ->paginate($per_page);

        $has_pricing = $plan->has_pricing;

        $recipes->getCollection()->transform(function ($recipe) use ($has_pricing) {
            $cost = $this->cost_service->calculate($recipe);

            return array_merge($recipe->toArray(), [
                'base_cost'                 => $cost['base_cost'],
                'production_cost'           => $has_pricing ? $cost['production_cost']           : null,
                'cost_per_yield'            => $has_pricing ? $cost['cost_per_yield']            : null,
                'suggested_price_per_yield' => $has_pricing ? $cost['suggested_price_per_yield'] : null,
            ]);
        });

        return response()->json([
            'success' => true,
            'data'    => $recipes,
            'message' => 'Receitas listadas com sucesso.',
        ]);
    }

    public function store(StoreRecipeRequest $request): JsonResponse
    {
        $user = $request->user()->load('plan');
        $plan = $user->plan;

        if ($limit = $this->checkRecipeLimit($user)) return $limit;

        $recipe = Recipe::create([
            'user_id'             => $user->id,
            'name'                => $request->name,
            'description'         => $request->description,
            'yield'               => $request->yield,
            'yield_unit'          => $request->yield_unit,
            'invisible_cost_pct'  => $plan->has_pricing ? $request->invisible_cost_pct : 25,
            'profit_multiplier'   => $plan->has_pricing ? $request->profit_multiplier  : 3.0,
        ]);

        $recipe->ingredients()->sync(
            $this->buildSyncData($request->ingredients)
        );

        $recipe->load('ingredients');
        $cost = $this->cost_service->calculate($recipe);

        return response()->json([
            'success' => true,
            'data'    => $this->formatRecipe($recipe, $cost, $plan->has_pricing),
            'message' => 'Receita criada com sucesso.',
        ], 201);
    }

    public function show(Request $request, Recipe $recipe): JsonResponse
    {
        if ($denied = $this->authorizeRecipe($request, $recipe)) return $denied;

        $plan = $request->user()->load('plan')->plan;
        $recipe->load('ingredients');
        $cost = $this->cost_service->calculate($recipe);

        return response()->json([
            'success' => true,
            'data'    => $this->formatRecipe($recipe, $cost, $plan->has_pricing),
            'message' => 'Receita encontrada.',
        ]);
    }

    public function update(UpdateRecipeRequest $request, Recipe $recipe): JsonResponse
    {
        if ($denied = $this->authorizeRecipe($request, $recipe)) return $denied;

        $plan = $request->user()->load('plan')->plan;

        $recipe->update(array_merge(
            $request->only('name', 'description', 'yield', 'yield_unit'),
            [
                'invisible_cost_pct' => $plan->has_pricing ? $request->invisible_cost_pct : 25,
                'profit_multiplier'  => $plan->has_pricing ? $request->profit_multiplier  : 3.0,
            ]
        ));

        if ($request->has('ingredients')) {
            $recipe->ingredients()->sync(
                $this->buildSyncData($request->ingredients)
            );
        }

        $recipe->load('ingredients');
        $cost = $this->cost_service->calculate($recipe);

        return response()->json([
            'success' => true,
            'data'    => $this->formatRecipe($recipe, $cost, $plan->has_pricing),
            'message' => 'Receita atualizada com sucesso.',
        ]);
    }

    public function duplicate(Request $request, Recipe $recipe): JsonResponse
    {
        if ($denied = $this->authorizeRecipe($request, $recipe)) return $denied;

        $user = $request->user()->load('plan');
        $plan = $user->plan;

        if ($limit = $this->checkRecipeLimit($user)) return $limit;

        $copy = Recipe::create([
            'user_id'            => $user->id,
            'name'               => $recipe->name . ' — Cópia',
            'description'        => $recipe->description,
            'yield'              => $recipe->yield,
            'yield_unit'         => $recipe->yield_unit,
            'invisible_cost_pct' => $recipe->invisible_cost_pct,
            'profit_multiplier'  => $recipe->profit_multiplier,
        ]);

        $recipe->load('ingredients');
        $sync = [];
        foreach ($recipe->ingredients as $ingredient) {
            $sync[$ingredient->id] = [
                'quantity' => $ingredient->pivot->quantity,
                'unit'     => $ingredient->pivot->unit,
            ];
        }
        $copy->ingredients()->sync($sync);

        $copy->load('ingredients');
        $cost = $this->cost_service->calculate($copy);

        return response()->json([
            'success' => true,
            'data'    => $this->formatRecipe($copy, $cost, $plan->has_pricing),
            'message' => 'Receita duplicada com sucesso.',
        ], 201);
    }

    public function destroy(Request $request, Recipe $recipe): JsonResponse
    {
        if ($denied = $this->authorizeRecipe($request, $recipe)) return $denied;

        if ($conflict = $this->checkRecipeInUse($recipe)) return $conflict;

        $recipe->delete();

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Receita excluída com sucesso.',
        ]);
    }

    private function checkRecipeInUse(Recipe $recipe): ?JsonResponse
    {
        $count = DB::table('product_recipes')
            ->join('products', 'products.id', '=', 'product_recipes.product_id')
            ->where('product_recipes.recipe_id', $recipe->id)
            ->where('products.active', true)
            ->count();

        if ($count === 0) return null;

        $produtos = $count === 1 ? 'produto' : 'produtos';

        return response()->json([
            'success'    => false,
            'message'    => "Esta receita está sendo usada em {$count} {$produtos}. Remova-a antes de excluir.",
            'error_code' => 'RECIPE_IN_USE',
        ], 409);
    }

    private function authorizeRecipe(Request $request, Recipe $recipe): ?JsonResponse
    {
        if ($recipe->user_id !== $request->user()->id || !$recipe->active) {
            return response()->json([
                'success'    => false,
                'message'    => 'Receita não encontrada.',
                'error_code' => 'RECIPE_NOT_FOUND',
            ], 404);
        }
        return null;
    }

    private function checkRecipeLimit(User $user): ?JsonResponse
    {
        $plan = $user->plan;
        if ($plan->max_recipes === null) return null;

        $count = Recipe::where('user_id', $user->id)->where('active', true)->count();
        if ($count < $plan->max_recipes) return null;

        return response()->json([
            'success'    => false,
            'message'    => "Seu plano permite no máximo {$plan->max_recipes} receitas. Faça upgrade para continuar.",
            'error_code' => 'PLAN_LIMIT_REACHED',
        ], 403);
    }

    private function buildSyncData(array $ingredients): array
    {
        $sync = [];
        foreach ($ingredients as $item) {
            $sync[$item['ingredient_id']] = [
                'quantity' => $item['quantity'],
                'unit'     => $item['unit'],
            ];
        }
        return $sync;
    }

    private function formatRecipe(Recipe $recipe, array $cost, bool $has_pricing = true): array
    {
        return [
            'id'                        => $recipe->id,
            'name'                      => $recipe->name,
            'description'               => $recipe->description,
            'yield'                     => $recipe->yield,
            'yield_unit'                => $recipe->yield_unit,
            'active'                    => $recipe->active,
            'created_at'                => $recipe->created_at,
            'updated_at'                => $recipe->updated_at,
            'ingredients'               => $cost['ingredients'],
            'ingredients_cost'          => $cost['ingredients_cost'],
            'insumos_cost'              => $cost['insumos_cost'],
            'invisible_cost_pct'        => $has_pricing ? $cost['invisible_cost_pct']        : null,
            'invisible_cost'            => $has_pricing ? $cost['invisible_cost']            : null,
            'production_cost'           => $has_pricing ? $cost['production_cost']           : null,
            'profit_multiplier'         => $has_pricing ? $cost['profit_multiplier']         : null,
            'profit_margin_pct'         => $has_pricing ? $cost['profit_margin_pct']         : null,
            'suggested_price'           => $has_pricing ? $cost['suggested_price']           : null,
            'base_cost'                 => $cost['base_cost'],
            'cost_per_yield'            => $has_pricing ? $cost['cost_per_yield']            : null,
            'suggested_price_per_yield' => $has_pricing ? $cost['suggested_price_per_yield'] : null,
        ];
    }
}
