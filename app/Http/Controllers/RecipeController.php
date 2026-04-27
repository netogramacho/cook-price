<?php

namespace App\Http\Controllers;

use App\Http\Requests\Recipe\StoreRecipeRequest;
use App\Http\Requests\Recipe\UpdateRecipeRequest;
use App\Models\Recipe;
use App\Services\RecipeCostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecipeController extends Controller
{
    public function __construct(private RecipeCostService $cost_service) {}

    public function index(Request $request): JsonResponse
    {
        $recipes = Recipe::where('user_id', $request->user()->id)
            ->with('ingredients')
            ->orderBy('name')
            ->paginate(15);

        $recipes->getCollection()->transform(function ($recipe) {
            $cost = $this->cost_service->calculate($recipe);

            return array_merge($recipe->toArray(), [
                'total_cost'     => $cost['total_cost'],
                'cost_per_yield' => $cost['cost_per_yield'],
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
        $recipe = Recipe::create([
            'user_id'             => $request->user()->id,
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
            'data'    => $this->formatRecipe($recipe, $cost),
            'message' => 'Receita criada com sucesso.',
        ], 201);
    }

    public function show(Request $request, Recipe $recipe): JsonResponse
    {
        if ($recipe->user_id !== $request->user()->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'Receita não encontrada.',
                'error_code' => 'RECIPE_NOT_FOUND',
            ], 404);
        }

        $recipe->load('ingredients');
        $cost = $this->cost_service->calculate($recipe);

        return response()->json([
            'success' => true,
            'data'    => $this->formatRecipe($recipe, $cost),
            'message' => 'Receita encontrada.',
        ]);
    }

    public function update(UpdateRecipeRequest $request, Recipe $recipe): JsonResponse
    {
        if ($recipe->user_id !== $request->user()->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'Receita não encontrada.',
                'error_code' => 'RECIPE_NOT_FOUND',
            ], 404);
        }

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
            'data'    => $this->formatRecipe($recipe, $cost),
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

    private function formatRecipe(Recipe $recipe, array $cost): array
    {
        return [
            'id'                        => $recipe->id,
            'name'                      => $recipe->name,
            'description'               => $recipe->description,
            'yield'                     => $recipe->yield,
            'yield_unit'                => $recipe->yield_unit,
            'created_at'                => $recipe->created_at,
            'updated_at'                => $recipe->updated_at,
            'ingredients'               => $cost['ingredients'],
            'ingredients_cost'          => $cost['ingredients_cost'],
            'packaging_cost'            => $cost['packaging_cost'],
            'base_cost'                 => $cost['base_cost'],
            'invisible_cost_pct'        => $cost['invisible_cost_pct'],
            'invisible_cost'            => $cost['invisible_cost'],
            'production_cost'           => $cost['production_cost'],
            'profit_multiplier'         => $cost['profit_multiplier'],
            'profit_margin_pct'         => $cost['profit_margin_pct'],
            'suggested_price'           => $cost['suggested_price'],
            'total_cost'                => $cost['total_cost'],
            'cost_per_yield'            => $cost['cost_per_yield'],
            'suggested_price_per_yield' => $cost['suggested_price_per_yield'],
        ];
    }
}
