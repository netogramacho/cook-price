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
        $ingredients = Ingredient::where('user_id', $request->user()->id)
            ->orderBy('name')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data'    => $ingredients,
            'message' => 'Ingredientes listados com sucesso.',
        ]);
    }

    public function store(StoreIngredientRequest $request): JsonResponse
    {
        $ingredient = Ingredient::create([
            'user_id'      => $request->user()->id,
            'name'         => $request->name,
            'type'         => $request->type,
            'unit'         => $request->unit,
            'package_size' => $request->package_size,
            'last_price'   => $request->last_price,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $ingredient,
            'message' => 'Ingrediente criado com sucesso.',
        ], 201);
    }

    public function show(Request $request, Ingredient $ingredient): JsonResponse
    {
        if ($ingredient->user_id !== $request->user()->id) {
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
        if ($ingredient->user_id !== $request->user()->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'Ingrediente não encontrado.',
                'error_code' => 'INGREDIENT_NOT_FOUND',
            ], 404);
        }

        $ingredient->update($request->only('name', 'type', 'unit', 'package_size', 'last_price'));

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
