<?php

namespace App\Http\Controllers;

use App\Http\Requests\Stock\StorePurchaseRequest;
use App\Models\Ingredient;
use App\Models\Purchase;
use App\Services\StockMovementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    public function __construct(private StockMovementService $stock_service) {}

    public function store(StorePurchaseRequest $request): JsonResponse
    {
        $user = $request->user();

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
