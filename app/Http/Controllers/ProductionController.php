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

    public function summary(Request $request): JsonResponse
    {
        $user_id     = $request->user()->id;
        $today       = now()->toDateString();
        $month_start = now()->startOfMonth()->toDateString();

        $today_row = Production::where('user_id', $user_id)
            ->whereDate('produced_at', $today)
            ->selectRaw('COUNT(*) as batches, COALESCE(SUM(total_yield), 0) as items, COALESCE(SUM(total_cost), 0) as cost')
            ->first();

        $month_row = Production::where('user_id', $user_id)
            ->where('produced_at', '>=', $month_start)
            ->selectRaw('COUNT(*) as batches, COALESCE(SUM(total_yield), 0) as items, COALESCE(SUM(total_cost), 0) as cost')
            ->first();

        return response()->json([
            'success' => true,
            'data'    => [
                'today' => [
                    'batches' => (int)   $today_row->batches,
                    'items'   => round((float) $today_row->items, 3),
                    'cost'    => round((float) $today_row->cost,  2),
                ],
                'month' => [
                    'batches' => (int)   $month_row->batches,
                    'items'   => round((float) $month_row->items, 3),
                    'cost'    => round((float) $month_row->cost,  2),
                ],
            ],
            'message' => 'Resumo de produções.',
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $per_page    = min((int) $request->get('per_page', 20), 100);
        $productions = Production::where('user_id', $request->user()->id)
            ->orderBy('produced_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($per_page);

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

        $costs       = $this->cost_service->calculate($recipe);
        $total_yield = round((float) $recipe->yield, 3);
        $total_cost  = round($costs['production_cost'], 2);
        $unit_cost   = $total_yield > 0 ? round($total_cost / $total_yield, 4) : 0;

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
            'quantity_recipes'  => 1,
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
        if ($guard = $this->authorizeProduction($request, $production)) return $guard;

        $production->delete();

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Produção excluída com sucesso.',
        ]);
    }

    private function authorizeProduction(Request $request, Production $production): ?JsonResponse
    {
        if ($production->user_id !== $request->user()->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'Produção não encontrada.',
                'error_code' => 'PRODUCTION_NOT_FOUND',
            ], 404);
        }
        return null;
    }
}
