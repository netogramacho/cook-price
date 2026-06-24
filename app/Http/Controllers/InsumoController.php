<?php

namespace App\Http\Controllers;

use App\Http\Requests\Insumo\StoreInsumoRequest;
use App\Http\Requests\Insumo\UpdateInsumoRequest;
use App\Models\Insumo;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InsumoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $per_page = min((int) $request->get('per_page', 15), 100);
        $search   = $request->get('search', '');

        $insumos = Insumo::where('user_id', $request->user()->id)
            ->where('active', true)
            ->when($search, fn ($q) => $q->where('name', 'like', '%' . $search . '%'))
            ->orderBy('name')
            ->paginate($per_page);

        return response()->json([
            'success' => true,
            'data'    => $insumos,
            'message' => 'Insumos listados com sucesso.',
        ]);
    }

    public function store(StoreInsumoRequest $request): JsonResponse
    {
        $user = $request->user()->load('plan');

        if ($limit = $this->checkIngredientLimit($user)) return $limit;

        $insumo = Insumo::create([
            'user_id'      => $user->id,
            'name'         => $request->name,
            'unit'         => $request->unit,
            'package_size' => $request->package_size,
            'last_price'   => $request->last_price,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $insumo,
            'message' => 'Insumo criado com sucesso.',
        ], 201);
    }

    public function show(Request $request, Insumo $insumo): JsonResponse
    {
        if ($denied = $this->authorizeInsumo($request, $insumo)) return $denied;

        return response()->json([
            'success' => true,
            'data'    => $insumo,
            'message' => 'Insumo encontrado.',
        ]);
    }

    public function update(UpdateInsumoRequest $request, Insumo $insumo): JsonResponse
    {
        if ($denied = $this->authorizeInsumo($request, $insumo)) return $denied;

        $insumo->update($request->only('name', 'unit', 'package_size', 'last_price'));

        return response()->json([
            'success' => true,
            'data'    => $insumo,
            'message' => 'Insumo atualizado com sucesso.',
        ]);
    }

    public function destroy(Request $request, Insumo $insumo): JsonResponse
    {
        if ($denied = $this->authorizeInsumo($request, $insumo)) return $denied;

        if ($conflict = $this->checkInsumoInUse($insumo)) return $conflict;

        $insumo->delete();

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Insumo excluído com sucesso.',
        ]);
    }

    private function authorizeInsumo(Request $request, Insumo $insumo): ?JsonResponse
    {
        if ($insumo->user_id !== $request->user()->id || !$insumo->active) {
            return response()->json([
                'success'    => false,
                'message'    => 'Insumo não encontrado.',
                'error_code' => 'INSUMO_NOT_FOUND',
            ], 404);
        }
        return null;
    }

    private function checkIngredientLimit(User $user): ?JsonResponse
    {
        $plan = $user->plan;
        if ($plan->max_ingredients === null) return null;

        // O limite de cadastro engloba ingredientes + insumos (mesma tabela).
        $count = \App\Models\Ingredient::where('user_id', $user->id)->where('active', true)->count();
        if ($count < $plan->max_ingredients) return null;

        return response()->json([
            'success'    => false,
            'message'    => "Seu plano permite no máximo {$plan->max_ingredients} cadastros. Faça upgrade para continuar.",
            'error_code' => 'PLAN_LIMIT_REACHED',
        ], 403);
    }

    private function checkInsumoInUse(Insumo $insumo): ?JsonResponse
    {
        $count = DB::table('product_insumos')->where('ingredient_id', $insumo->id)->count();
        if ($count === 0) return null;

        $produtos = $count === 1 ? 'produto' : 'produtos';

        return response()->json([
            'success'    => false,
            'message'    => "Este insumo está sendo usado em {$count} {$produtos}. Remova-o antes de excluir.",
            'error_code' => 'INSUMO_IN_USE',
        ], 409);
    }
}
