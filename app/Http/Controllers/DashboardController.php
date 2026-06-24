<?php

namespace App\Http\Controllers;

use App\Models\Ingredient;
use App\Models\Product;
use App\Models\Production;
use App\Models\Recipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user()->load('plan');

        $ingredients_count = Ingredient::where('user_id', $user->id)->where('active', true)->where('type', 'ingredient')->count();
        $insumos_count     = Ingredient::where('user_id', $user->id)->where('active', true)->where('type', 'insumo')->count();
        $recipes_count     = Recipe::where('user_id', $user->id)->where('active', true)->count();
        $products_count    = $user->plan->has_products
            ? Product::where('user_id', $user->id)->where('active', true)->count()
            : null;
        $productions_count = $user->plan->has_production
            ? Production::where('user_id', $user->id)->where('status', 'completed')->count()
            : null;

        return response()->json([
            'success' => true,
            'data'    => [
                'ingredients_count' => $ingredients_count,
                'insumos_count'     => $insumos_count,
                'recipes_count'     => $recipes_count,
                'products_count'    => $products_count,
                'productions_count' => $productions_count,
            ],
            'message' => 'Dashboard carregado com sucesso.',
        ]);
    }
}
