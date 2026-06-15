<?php

namespace App\Http\Controllers;

use App\Http\Requests\Stock\StorePurchaseRequest;
use App\Models\Ingredient;
use App\Models\Purchase;
use App\Services\StockMovementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    public function __construct(private StockMovementService $stock_service) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()->load('plan');

        if (!$user->plan->has_stock) {
            return response()->json([
                'success'    => false,
                'message'    => 'Seu plano não inclui controle de estoque.',
                'error_code' => 'PLAN_FEATURE_UNAVAILABLE',
            ], 403);
        }

        $search = $request->query('search', '');

        $purchases = Purchase::where('user_id', $user->id)
            ->when($search, fn($q) => $q->where('notes', 'like', "%{$search}%"))
            ->with(['movements.ingredient:id,name,unit'])
            ->orderByDesc('purchased_at')
            ->orderByDesc('created_at')
            ->paginate(15);

        $formatted = $purchases->through(fn($purchase) => [
            'id'           => $purchase->id,
            'purchased_at' => $purchase->purchased_at?->format('Y-m-d'),
            'notes'        => $purchase->notes,
            'total_value'  => number_format($purchase->movements->sum(fn($m) => (float) $m->price_paid * (float) $m->num_packages), 2, '.', ''),
            'items'        => $purchase->movements->map(fn($m) => [
                'id'           => $m->id,
                'ingredient'   => ['id' => $m->ingredient->id, 'name' => $m->ingredient->name, 'unit' => $m->ingredient->unit],
                'quantity'     => $m->quantity,
                'unit_price'   => $m->unit_price,
                'num_packages' => $m->num_packages,
                'price_paid'   => $m->price_paid,
                'total_price'  => number_format((float) $m->price_paid * (float) $m->num_packages, 2, '.', ''),
            ]),
        ]);

        return response()->json([
            'success' => true,
            'data'    => $formatted,
            'message' => 'Compras listadas com sucesso.',
        ]);
    }

    public function destroy(Request $request, Purchase $purchase): JsonResponse
    {
        if ($purchase->user_id !== $request->user()->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'Compra não encontrada.',
                'error_code' => 'PURCHASE_NOT_FOUND',
            ], 404);
        }

        $purchase->load('movements.ingredient');

        $missing_snapshot = $purchase->movements->first(fn($m) => $m->prev_stock_quantity === null);
        if ($missing_snapshot) {
            return response()->json([
                'success'    => false,
                'message'    => 'Esta compra foi registrada antes do suporte a exclusão. Use o script local para removê-la.',
                'error_code' => 'PURCHASE_NO_SNAPSHOT',
            ], 422);
        }

        $blocked = [];
        foreach ($purchase->movements as $movement) {
            $has_later = \App\Models\StockMovement::where('ingredient_id', $movement->ingredient_id)
                ->where('id', '!=', $movement->id)
                ->where('created_at', '>', $movement->created_at)
                ->exists();

            if ($has_later) $blocked[] = $movement->ingredient->name;
        }

        if (!empty($blocked)) {
            return response()->json([
                'success'    => false,
                'message'    => 'Existem movimentos de estoque posteriores a esta compra.',
                'error_code' => 'PURCHASE_HAS_LATER_MOVEMENTS',
                'data'       => ['blocked_ingredients' => $blocked],
            ], 422);
        }

        DB::transaction(function () use ($purchase) {
            foreach ($purchase->movements as $movement) {
                $ingredient = $movement->ingredient;
                $ingredient->stock_quantity = $movement->prev_stock_quantity;
                $ingredient->last_price     = $movement->prev_last_price;
                $ingredient->save();
                $movement->delete();
            }
            $purchase->delete();
        });

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Compra excluída com sucesso.',
        ]);
    }

    public function resetAndDelete(Request $request, Purchase $purchase): JsonResponse
    {
        if ($purchase->user_id !== $request->user()->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'Compra não encontrada.',
                'error_code' => 'PURCHASE_NOT_FOUND',
            ], 404);
        }

        $purchase->load('movements.ingredient');

        DB::transaction(function () use ($purchase, $request) {
            foreach ($purchase->movements as $movement) {
                $ingredient = $movement->ingredient;

                \App\Models\StockMovement::create([
                    'ingredient_id' => $ingredient->id,
                    'user_id'       => $request->user()->id,
                    'type'          => 'reset',
                    'quantity'      => -(float) $ingredient->stock_quantity,
                    'unit_price'    => 0,
                    'movement_date' => now()->toDateString(),
                    'notes'         => 'Estoque zerado por cancelamento de compra.',
                ]);

                $ingredient->stock_quantity = 0;
                $ingredient->last_price     = 0;
                $ingredient->save();
            }

            $purchase->delete();
        });

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Compra cancelada e ingredientes resetados. Re-registre as compras corretas.',
        ]);
    }

    public function store(StorePurchaseRequest $request): JsonResponse
    {
        $user = $request->user()->load('plan');

        if (!$user->plan->has_stock) {
            return response()->json([
                'success'    => false,
                'message'    => 'Seu plano não inclui controle de estoque. Faça upgrade para continuar.',
                'error_code' => 'PLAN_FEATURE_UNAVAILABLE',
            ], 403);
        }

        // Validate ownership of all ingredients before touching anything
        $ingredient_ids = collect($request->items)->pluck('ingredient_id')->unique();
        $ingredients    = Ingredient::whereIn('id', $ingredient_ids)
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('id');

        $not_found = $ingredient_ids->diff($ingredients->keys());
        if ($not_found->isNotEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Um ou mais ingredientes não foram encontrados.',
                'errors'  => ['items' => ['Ingrediente não encontrado ou sem permissão de acesso.']],
            ], 422);
        }

        $movements = DB::transaction(function () use ($request, $user, $ingredients) {
            $purchase = Purchase::create([
                'user_id'      => $user->id,
                'purchased_at' => $request->purchased_at,
                'notes'        => $request->notes,
            ]);

            $result = [];
            foreach ($request->items as $item) {
                $ingredient = $ingredients->get($item['ingredient_id']);
                $result[]   = $this->stock_service->purchase($ingredient, $item, $purchase, $user);
            }

            return ['purchase' => $purchase, 'movements' => $result];
        });

        return response()->json([
            'success' => true,
            'data'    => $movements,
            'message' => 'Compra registrada com sucesso.',
        ], 201);
    }
}
