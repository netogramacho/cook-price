<?php

namespace App\Http\Controllers;

use App\Http\Requests\User\ChangePasswordRequest;
use App\Http\Requests\User\UpdateSettingsRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('plan');

        return response()->json([
            'success' => true,
            'data'    => array_merge(
                $user->only('id', 'name', 'email', 'email_verified_at', 'invisible_cost_pct', 'profit_multiplier'),
                ['plan' => $user->plan]
            ),
            'message' => 'Usuário encontrado.',
        ]);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $request->user()->update(['password' => $request->password]);

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Senha alterada com sucesso.',
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
