<?php

namespace App\Http\Controllers;

use App\Http\Requests\Production\StoreProductionRequest;
use App\Models\Product;
use App\Models\Production;
use App\Services\ProductCostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductionController extends Controller
{
    public function __construct(
        private ProductCostService $cost_service,
    ) {}

    public function summary(Request $request): JsonResponse
    {
        $user_id     = $request->user()->id;
        $today       = now()->toDateString();
        $month_start = now()->startOfMonth()->toDateString();

        $today_row = Production::where('user_id', $user_id)
            ->where('status', 'completed')
            ->whereDate('produced_at', $today)
            ->selectRaw('COUNT(*) as batches, COALESCE(SUM(total_yield), 0) as items, COALESCE(SUM(total_cost), 0) as cost')
            ->first();

        $month_row = Production::where('user_id', $user_id)
            ->where('status', 'completed')
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
        $product = Product::where('id', $request->product_id)
            ->where('user_id', $request->user()->id)
            ->with(['recipes', 'insumos'])
            ->first();

        if (!$product) {
            return response()->json([
                'success'    => false,
                'message'    => 'Produto não encontrado.',
                'error_code' => 'PRODUCT_NOT_FOUND',
            ], 404);
        }

        $costs       = $this->cost_service->calculate($product);
        $total_yield = round((float) $product->yield, 3);
        $total_cost  = round($costs['production_cost'], 2);
        $unit_cost   = $total_yield > 0 ? round($total_cost / $total_yield, 4) : 0;

        $snapshot = [
            'product_name'              => $product->name,
            'product_updated_at'        => $product->updated_at->toISOString(),
            'yield'                     => (float) $product->yield,
            'yield_unit'                => $product->yield_unit,
            'invisible_cost_pct'        => $costs['invisible_cost_pct'],
            'profit_multiplier'         => $costs['profit_multiplier'],
            'recipes'                   => $costs['recipes']->map(fn ($r) => [
                'name'           => $r['name'],
                'cost_per_yield' => $r['cost_per_yield'],
                'quantity'       => $r['quantity'],
                'subtotal'       => $r['subtotal'],
            ])->values()->toArray(),
            'ingredients'               => $costs['ingredients']->map(fn ($i) => [
                'name'     => $i['name'],
                'unit'     => $i['unit'],
                'quantity' => $i['quantity'],
                'subtotal' => $i['subtotal'],
            ])->values()->toArray(),
            'insumos'                   => $costs['insumos']->map(fn ($i) => [
                'name'     => $i['name'],
                'unit'     => $i['unit'],
                'quantity' => $i['quantity'],
                'subtotal' => $i['subtotal'],
            ])->values()->toArray(),
            'recipes_cost'              => $costs['recipes_cost'],
            'ingredients_cost'          => $costs['ingredients_cost'],
            'insumos_cost'              => $costs['insumos_cost'],
            'invisible_cost'            => $costs['invisible_cost'],
            'production_cost'           => $costs['production_cost'],
            'suggested_price_per_yield' => $costs['suggested_price_per_yield'],
        ];

        $production = Production::create([
            'user_id'          => $request->user()->id,
            'product_id'       => $product->id,
            'quantity_recipes' => 1,
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

    public function cancel(Request $request, Production $production): JsonResponse
    {
        if ($guard = $this->authorizeProduction($request, $production)) return $guard;

        if ($production->status === 'cancelled') {
            return response()->json([
                'success'    => false,
                'message'    => 'Esta produção já está cancelada.',
                'error_code' => 'PRODUCTION_ALREADY_CANCELLED',
            ], 422);
        }

        $production->update(['status' => 'cancelled']);

        return response()->json([
            'success' => true,
            'data'    => $production,
            'message' => 'Produção cancelada com sucesso.',
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
