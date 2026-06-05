<?php

namespace App\Http\Controllers;

use App\Http\Requests\Stock\AdjustStockRequest;
use App\Models\Ingredient;
use App\Services\StockMovementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockMovementController extends Controller
{
    public function __construct(private StockMovementService $stock_service) {}

    public function adjust(AdjustStockRequest $request, Ingredient $ingredient): JsonResponse
    {
        $user = $request->user()->load('plan');

        if (!$user->plan->has_stock) {
            return response()->json([
                'success'    => false,
                'message'    => 'Seu plano não inclui controle de estoque. Faça upgrade para continuar.',
                'error_code' => 'PLAN_FEATURE_UNAVAILABLE',
            ], 403);
        }

        if ($ingredient->user_id !== $user->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'Ingrediente não encontrado.',
                'error_code' => 'INGREDIENT_NOT_FOUND',
            ], 404);
        }

        if (!$ingredient->active) {
            return response()->json([
                'success'    => false,
                'message'    => 'Ingrediente não encontrado.',
                'error_code' => 'INGREDIENT_NOT_FOUND',
            ], 404);
        }

        if ($request->has('min_stock')) {
            $ingredient->min_stock = $request->min_stock;
        }

        $new_quantity  = (float) $request->stock_quantity;
        $movement_date = $request->movement_date ? \Carbon\Carbon::parse($request->movement_date) : null;

        if ($new_quantity !== (float) $ingredient->stock_quantity) {
            $this->stock_service->adjust($ingredient, $new_quantity, $request->user(), $request->notes, $movement_date);
        } else {
            $ingredient->save();
        }

        $ingredient->refresh();

        return response()->json([
            'success' => true,
            'data'    => [
                'id'             => $ingredient->id,
                'stock_quantity' => $ingredient->stock_quantity,
                'min_stock'      => $ingredient->min_stock,
            ],
            'message' => 'Estoque ajustado com sucesso.',
        ]);
    }

    public function index(Request $request, Ingredient $ingredient): JsonResponse
    {
        $user = $request->user()->load('plan');

        if (!$user->plan->has_stock_history) {
            return response()->json([
                'success'    => false,
                'message'    => 'Seu plano não inclui histórico de movimentações. Faça upgrade para continuar.',
                'error_code' => 'PLAN_FEATURE_UNAVAILABLE',
            ], 403);
        }

        if ($ingredient->user_id !== $user->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'Ingrediente não encontrado.',
                'error_code' => 'INGREDIENT_NOT_FOUND',
            ], 404);
        }

        $movements = $ingredient->stockMovements()
            ->with(['recipe:id,name', 'purchase:id,purchased_at'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data'    => $movements,
            'message' => 'Movimentações listadas com sucesso.',
        ]);
    }
}
