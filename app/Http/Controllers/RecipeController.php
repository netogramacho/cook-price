<?php

namespace App\Http\Controllers;

use App\Http\Requests\Recipe\StoreRecipeRequest;
use App\Http\Requests\Recipe\UpdateRecipeRequest;
use App\Models\Plan;
use App\Models\Recipe;
use App\Services\RecipeCostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
                'total_cost'                => $cost['total_cost'],
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

        if ($plan->max_recipes !== null) {
            $count = Recipe::where('user_id', $user->id)->where('active', true)->count();
            if ($count >= $plan->max_recipes) {
                return response()->json([
                    'success'    => false,
                    'message'    => "Seu plano permite no máximo {$plan->max_recipes} receitas. Faça upgrade para continuar.",
                    'error_code' => 'PLAN_LIMIT_REACHED',
                ], 403);
            }
        }

        $recipe = Recipe::create([
            'user_id'             => $user->id,
            'name'                => $request->name,
            'description'         => $request->description,
            'yield'               => $request->yield,
            'yield_unit'          => $request->yield_unit,
            'invisible_cost_pct'  => $request->invisible_cost_pct,
            'profit_multiplier'   => $request->profit_multiplier,
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
        if ($recipe->user_id !== $request->user()->id || !$recipe->active) {
            return response()->json([
                'success'    => false,
                'message'    => 'Receita não encontrada.',
                'error_code' => 'RECIPE_NOT_FOUND',
            ], 404);
        }

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
        if ($recipe->user_id !== $request->user()->id || !$recipe->active) {
            return response()->json([
                'success'    => false,
                'message'    => 'Receita não encontrada.',
                'error_code' => 'RECIPE_NOT_FOUND',
            ], 404);
        }

        $plan = $request->user()->load('plan')->plan;

        $recipe->update($request->only('name', 'description', 'yield', 'yield_unit', 'invisible_cost_pct', 'profit_multiplier'));

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

    public function destroy(Request $request, Recipe $recipe): JsonResponse
    {
        if ($recipe->user_id !== $request->user()->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'Receita não encontrada.',
                'error_code' => 'RECIPE_NOT_FOUND',
            ], 404);
        }

        $recipe->delete();

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Receita excluída com sucesso.',
        ]);
    }

    private function buildSyncData(array $ingredients): array
    {
        $sync = [];
        foreach ($ingredients as $item) {
            $sync[$item['ingredient_id']] = ['quantity' => $item['quantity']];
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
            'packaging_cost'            => $has_pricing ? $cost['packaging_cost']            : null,
            'base_cost'                 => $cost['base_cost'],
            'invisible_cost_pct'        => $has_pricing ? $cost['invisible_cost_pct']        : null,
            'invisible_cost'            => $has_pricing ? $cost['invisible_cost']            : null,
            'production_cost'           => $has_pricing ? $cost['production_cost']           : null,
            'profit_multiplier'         => $has_pricing ? $cost['profit_multiplier']         : null,
            'profit_margin_pct'         => $has_pricing ? $cost['profit_margin_pct']         : null,
            'suggested_price'           => $has_pricing ? $cost['suggested_price']           : null,
            'total_cost'                => $cost['total_cost'],
            'cost_per_yield'            => $has_pricing ? $cost['cost_per_yield']            : null,
            'suggested_price_per_yield' => $has_pricing ? $cost['suggested_price_per_yield'] : null,
        ];
    }
}
