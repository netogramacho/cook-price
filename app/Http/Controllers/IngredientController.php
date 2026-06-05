<?php

namespace App\Http\Controllers;

use App\Http\Requests\Ingredient\StoreIngredientRequest;
use App\Http\Requests\Ingredient\UpdateIngredientRequest;
use App\Models\Ingredient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IngredientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $per_page = min((int) $request->get('per_page', 15), 100);
        $search   = $request->get('search', '');

        $ingredients = Ingredient::where('user_id', $request->user()->id)
            ->where('active', true)
            ->when($search, fn ($q) => $q->where('name', 'like', '%' . $search . '%'))
            ->orderBy('name')
            ->paginate($per_page);

        return response()->json([
            'success' => true,
            'data'    => $ingredients,
            'message' => 'Ingredientes listados com sucesso.',
        ]);
    }

    public function store(StoreIngredientRequest $request): JsonResponse
    {
        $user = $request->user()->load('plan');
        $plan = $user->plan;

        if ($plan->max_ingredients !== null) {
            $count = Ingredient::where('user_id', $user->id)->where('active', true)->count();
            if ($count >= $plan->max_ingredients) {
                return response()->json([
                    'success'    => false,
                    'message'    => "Seu plano permite no máximo {$plan->max_ingredients} ingredientes. Faça upgrade para continuar.",
                    'error_code' => 'PLAN_LIMIT_REACHED',
                ], 403);
            }
        }

        $ingredient = Ingredient::create([
            'user_id'      => $user->id,
            'name'         => $request->name,
            'type'         => $request->type,
            'unit'         => $request->unit,
            'package_size' => $request->package_size,
            'last_price'   => $request->last_price,
            'min_stock'    => $request->min_stock ?? null,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $ingredient,
            'message' => 'Ingrediente criado com sucesso.',
        ], 201);
    }

    public function show(Request $request, Ingredient $ingredient): JsonResponse
    {
        if ($ingredient->user_id !== $request->user()->id || !$ingredient->active) {
            return response()->json([
                'success'    => false,
                'message'    => 'Ingrediente não encontrado.',
                'error_code' => 'INGREDIENT_NOT_FOUND',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $ingredient,
            'message' => 'Ingrediente encontrado.',
        ]);
    }

    public function update(UpdateIngredientRequest $request, Ingredient $ingredient): JsonResponse
    {
        if ($ingredient->user_id !== $request->user()->id || !$ingredient->active) {
            return response()->json([
                'success'    => false,
                'message'    => 'Ingrediente não encontrado.',
                'error_code' => 'INGREDIENT_NOT_FOUND',
            ], 404);
        }

        $ingredient->update($request->only('name', 'type', 'unit', 'package_size', 'last_price', 'min_stock'));

        return response()->json([
            'success' => true,
            'data'    => $ingredient,
            'message' => 'Ingrediente atualizado com sucesso.',
        ]);
    }

    public function destroy(Request $request, Ingredient $ingredient): JsonResponse
    {
        if ($ingredient->user_id !== $request->user()->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'Ingrediente não encontrado.',
                'error_code' => 'INGREDIENT_NOT_FOUND',
            ], 404);
        }

        $ingredient->delete();

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Ingrediente excluído com sucesso.',
        ]);
    }
}
