<?php

namespace App\Http\Controllers;

use App\Models\Ingredient;
use App\Models\Recipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user_id = $request->user()->id;

        $recipes_count     = Recipe::where('user_id', $user_id)->where('active', true)->count();
        $ingredients_count = Ingredient::where('user_id', $user_id)->where('active', true)->count();

        $critical_stock = Ingredient::where('user_id', $user_id)
            ->whereNotNull('min_stock')
            ->where('min_stock', '>', 0)
            ->whereColumn('stock_quantity', '<', 'min_stock')
            ->orderBy('name')
            ->get(['id', 'name', 'unit', 'stock_quantity', 'min_stock']);

        return response()->json([
            'success' => true,
            'data'    => [
                'recipes_count'     => $recipes_count,
                'ingredients_count' => $ingredients_count,
                'critical_stock'    => $critical_stock,
            ],
            'message' => 'Dashboard carregado com sucesso.',
        ]);
    }
}
