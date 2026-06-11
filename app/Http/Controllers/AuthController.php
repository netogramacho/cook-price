<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $free_plan_id = Plan::free()->id;

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'phone'    => $request->phone,
            'password' => $request->password,
            'plan_id'  => $free_plan_id,
        ]);

        $user->sendEmailVerificationNotification();
        $user->load('plan');

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'data'    => [
                'user'  => array_merge(
                    $user->only('id', 'name', 'email', 'phone', 'email_verified_at'),
                    ['plan' => $user->plan]
                ),
                'token' => $token,
            ],
            'message' => 'Usuário criado com sucesso.',
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'success'    => false,
                'message'    => 'Credenciais inválidas.',
                'error_code' => 'INVALID_CREDENTIALS',
            ], 401);
        }

        $user  = Auth::user();
        $token = $user->createToken('auth_token')->plainTextToken;
        $user->load('plan');

        return response()->json([
            'success' => true,
            'data'    => [
                'user'  => array_merge(
                    $user->only('id', 'name', 'email', 'phone', 'email_verified_at'),
                    ['plan' => $user->plan]
                ),
                'token' => $token,
            ],
            'message' => 'Login realizado com sucesso.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Logout realizado com sucesso.',
        ]);
    }
}
