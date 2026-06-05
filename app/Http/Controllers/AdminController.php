<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function updateUserPlan(Request $request, string $userId): JsonResponse
    {
        if ($request->header('X-Admin-Token') !== config('app.admin_token')) {
            return response()->json([
                'success'    => false,
                'message'    => 'Não autorizado.',
                'error_code' => 'UNAUTHORIZED',
            ], 401);
        }

        $request->validate([
            'plan' => ['required', 'in:free,basic,pro'],
        ]);

        $user = User::find($userId);

        if (!$user) {
            return response()->json([
                'success'    => false,
                'message'    => 'Usuário não encontrado.',
                'error_code' => 'USER_NOT_FOUND',
            ], 404);
        }

        $plan = Plan::where('name', $request->plan)->first();

        $user->plan_id = $plan->id;
        $user->save(); // dispara UserObserver::updated()

        return response()->json([
            'success' => true,
            'data'    => [
                'user_id' => $user->id,
                'email'   => $user->email,
                'plan'    => $plan->name,
                'label'   => $plan->label,
            ],
            'message' => "Plano atualizado para {$plan->label} com sucesso.",
        ]);
    }
}
