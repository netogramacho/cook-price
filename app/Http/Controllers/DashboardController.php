<?php

namespace App\Http\Controllers;

use App\Models\Ingredient;
use App\Models\Production;
use App\Models\Recipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user()->load('plan');

        $recipes_count     = Recipe::where('user_id', $user->id)->where('active', true)->count();
        $ingredients_count = Ingredient::where('user_id', $user->id)->where('active', true)->count();
        $productions_count = $user->plan->has_production
            ? Production::where('user_id', $user->id)->count()
            : null;

        return response()->json([
            'success' => true,
            'data'    => [
                'recipes_count'     => $recipes_count,
                'ingredients_count' => $ingredients_count,
                'productions_count' => $productions_count,
            ],
            'message' => 'Dashboard carregado com sucesso.',
        ]);
    }
}
