<?php

namespace App\Http\Controllers;

use App\Http\Requests\User\UpdateSettingsRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->only('id', 'name', 'email', 'invisible_cost_pct', 'profit_multiplier');

        return response()->json([
            'success' => true,
            'data'    => $user,
            'message' => 'Usuário encontrado.',
        ]);
    }

    public function updateSettings(UpdateSettingsRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->only('invisible_cost_pct', 'profit_multiplier'));

        return response()->json([
            'success' => true,
            'data'    => $user->only('id', 'name', 'email', 'invisible_cost_pct', 'profit_multiplier'),
            'message' => 'Configurações salvas com sucesso.',
        ]);
    }
}
