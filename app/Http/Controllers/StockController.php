<?php

namespace App\Http\Controllers;

use App\Models\Ingredient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $per_page = min((int) $request->get('per_page', 15), 100);
        $search   = $request->get('search', '');

        $query = Ingredient::where('user_id', $request->user()->id)
            ->when($search, fn ($q) => $q->where('name', 'like', '%' . $search . '%'))
            ->orderBy('name')
            ->paginate($per_page);

        $query->getCollection()->transform(function ($ingredient) {
            return $this->formatIngredient($ingredient);
        });

        return response()->json([
            'success' => true,
            'data'    => $query,
            'message' => 'Estoque listado com sucesso.',
        ]);
    }

    private function formatIngredient(Ingredient $ingredient): array
    {
        return [
            'id'             => $ingredient->id,
            'name'           => $ingredient->name,
            'type'           => $ingredient->type,
            'unit'           => $ingredient->unit,
            'package_size'   => $ingredient->package_size,
            'last_price'     => $ingredient->last_price,
            'stock_quantity' => $ingredient->stock_quantity,
        ];
    }
}
