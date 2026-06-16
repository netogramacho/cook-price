<?php

namespace App\Http\Controllers;

use App\Http\Requests\Production\StoreProductionRequest;
use App\Models\Production;
use App\Models\Recipe;
use App\Services\RecipeCostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductionController extends Controller
{
    public function __construct(
        private RecipeCostService $cost_service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $productions = Production::where('user_id', $request->user()->id)
            ->orderBy('produced_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data'    => $productions,
            'message' => 'Produções carregadas com sucesso.',
        ]);
    }

    public function store(StoreProductionRequest $request): JsonResponse
    {
        $recipe = Recipe::where('id', $request->recipe_id)
            ->where('user_id', $request->user()->id)
            ->with('ingredients')
            ->first();

        if (!$recipe) {
            return response()->json([
                'success'    => false,
                'message'    => 'Receita não encontrada.',
                'error_code' => 'RECIPE_NOT_FOUND',
            ], 404);
        }

        $costs            = $this->cost_service->calculate($recipe);
        $quantity_recipes = (float) $request->quantity_recipes;
        $total_yield      = round((float) $recipe->yield * $quantity_recipes, 3);
        $total_cost       = round($costs['production_cost'] * $quantity_recipes, 2);
        $unit_cost        = $total_yield > 0 ? round($total_cost / $total_yield, 4) : 0;

        $snapshot = [
            'recipe_name'               => $recipe->name,
            'recipe_updated_at'         => $recipe->updated_at->toISOString(),
            'yield'                     => (float) $recipe->yield,
            'yield_unit'                => $recipe->yield_unit,
            'invisible_cost_pct'        => $costs['invisible_cost_pct'],
            'profit_multiplier'         => $costs['profit_multiplier'],
            'ingredients'               => $costs['ingredients']->map(fn ($i) => [
                'name'       => $i['name'],
                'type'       => $i['type'],
                'unit'       => $i['unit'],
                'quantity'   => $i['quantity'],
                'unit_price' => $i['price_per_unit'],
                'subtotal'   => $i['subtotal'],
            ])->values()->toArray(),
            'ingredients_cost'          => $costs['ingredients_cost'],
            'packaging_cost'            => $costs['packaging_cost'],
            'invisible_cost'            => $costs['invisible_cost'],
            'production_cost'           => $costs['production_cost'],
            'suggested_price_per_yield' => $costs['suggested_price_per_yield'],
        ];

        $production = Production::create([
            'user_id'          => $request->user()->id,
            'recipe_id'        => $recipe->id,
            'quantity_recipes'  => $quantity_recipes,
            'total_yield'      => $total_yield,
            'total_cost'       => $total_cost,
            'unit_cost'        => $unit_cost,
            'notes'            => $request->notes,
            'snapshot'         => $snapshot,
            'produced_at'      => now()->toDateString(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => $production,
            'message' => 'Produção registrada com sucesso.',
        ], 201);
    }

    public function destroy(Request $request, Production $production): JsonResponse
    {
        if ($production->user_id !== $request->user()->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'Produção não encontrada.',
                'error_code' => 'PRODUCTION_NOT_FOUND',
            ], 404);
        }

        $production->delete();

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Produção excluída com sucesso.',
        ]);
    }
}
