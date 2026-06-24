<?php

namespace App\Http\Controllers;

use App\Http\Requests\Ingredient\StoreIngredientRequest;
use App\Http\Requests\Ingredient\UpdateIngredientRequest;
use App\Models\Ingredient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IngredientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $per_page = min((int) $request->get('per_page', 15), 100);
        $search   = $request->get('search', '');

        $ingredients = Ingredient::where('user_id', $request->user()->id)
            ->where('active', true)
            ->where('type', 'ingredient')
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

        if ($limit = $this->checkIngredientLimit($user)) return $limit;

        $ingredient = Ingredient::create([
            'user_id'      => $user->id,
            'name'         => $request->name,
            'type'         => \App\Enums\IngredientType::Ingredient,
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
        if ($denied = $this->authorizeIngredient($request, $ingredient)) return $denied;

        return response()->json([
            'success' => true,
            'data'    => $ingredient,
            'message' => 'Ingrediente encontrado.',
        ]);
    }

    public function update(UpdateIngredientRequest $request, Ingredient $ingredient): JsonResponse
    {
        if ($denied = $this->authorizeIngredient($request, $ingredient)) return $denied;

        $ingredient->update($request->only('name', 'unit', 'package_size', 'last_price', 'min_stock'));

        return response()->json([
            'success' => true,
            'data'    => $ingredient,
            'message' => 'Ingrediente atualizado com sucesso.',
        ]);
    }

    private function authorizeIngredient(Request $request, Ingredient $ingredient): ?JsonResponse
    {
        if ($ingredient->user_id !== $request->user()->id || !$ingredient->active) {
            return response()->json([
                'success'    => false,
                'message'    => 'Ingrediente não encontrado.',
                'error_code' => 'INGREDIENT_NOT_FOUND',
            ], 404);
        }
        return null;
    }

    private function checkIngredientLimit(User $user): ?JsonResponse
    {
        $plan = $user->plan;
        if ($plan->max_ingredients === null) return null;

        $count = Ingredient::where('user_id', $user->id)->where('active', true)->count();
        if ($count < $plan->max_ingredients) return null;

        return response()->json([
            'success'    => false,
            'message'    => "Seu plano permite no máximo {$plan->max_ingredients} ingredientes. Faça upgrade para continuar.",
            'error_code' => 'PLAN_LIMIT_REACHED',
        ], 403);
    }

    public function destroy(Request $request, Ingredient $ingredient): JsonResponse
    {
        if ($denied = $this->authorizeIngredient($request, $ingredient)) return $denied;

        if ($conflict = $this->checkIngredientInUse($ingredient)) return $conflict;

        $ingredient->delete();

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Ingrediente excluído com sucesso.',
        ]);
    }

    private function checkIngredientInUse(Ingredient $ingredient): ?JsonResponse
    {
        $recipe_count = $ingredient->recipes()->where('active', true)->count();

        $product_count = DB::table('product_insumos')
            ->join('products', 'products.id', '=', 'product_insumos.product_id')
            ->where('product_insumos.ingredient_id', $ingredient->id)
            ->where('products.active', true)
            ->count();

        if ($recipe_count === 0 && $product_count === 0) return null;

        $parts = [];
        if ($recipe_count > 0)  $parts[] = $recipe_count . ' ' . ($recipe_count === 1 ? 'receita' : 'receitas');
        if ($product_count > 0) $parts[] = $product_count . ' ' . ($product_count === 1 ? 'produto' : 'produtos');
        $where = implode(' e ', $parts);

        return response()->json([
            'success'    => false,
            'message'    => "Este ingrediente está sendo usado em {$where}. Remova-o antes de excluir.",
            'error_code' => 'INGREDIENT_IN_USE',
        ], 409);
    }
}
