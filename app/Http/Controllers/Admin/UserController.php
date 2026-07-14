<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Models\Ingredient;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Production;
use App\Models\Recipe;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $per_page = min((int) $request->get('per_page', 20), 100);
        $search   = trim((string) $request->get('search', ''));

        $users = User::query()
            ->with('plan')
            ->when($search, fn ($q) => $q->where(fn ($sub) => $sub
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")))
            ->orderByDesc('created_at')
            ->paginate($per_page);

        return response()->json([
            'success' => true,
            'data'    => $users,
            'message' => 'Usuários listados com sucesso.',
        ]);
    }

    public function show(User $user): JsonResponse
    {
        $user->load('plan');

        $subscriptions = Subscription::where('user_id', $user->id)
            ->with('plan')
            ->orderByDesc('created_at')
            ->get()
            // Identificadores/datas ocultos do usuário final, mas úteis ao admin para diagnóstico.
            ->each->makeVisible(['mp_preapproval_id', 'created_at', 'updated_at']);

        return response()->json([
            'success' => true,
            'data'    => [
                'user'          => array_merge(
                    $user->only('id', 'name', 'email', 'phone', 'email_verified_at', 'is_admin', 'created_at'),
                    ['plan' => $user->plan]
                ),
                'counts'        => [
                    'ingredients' => Ingredient::where('user_id', $user->id)->where('type', 'ingredient')->count(),
                    'insumos'     => Ingredient::where('user_id', $user->id)->where('type', 'insumo')->count(),
                    'recipes'     => Recipe::where('user_id', $user->id)->count(),
                    'products'    => Product::where('user_id', $user->id)->count(),
                    'productions' => Production::where('user_id', $user->id)->count(),
                ],
                'subscriptions' => $subscriptions,
            ],
            'message' => 'Usuário carregado com sucesso.',
        ]);
    }

    public function updatePlan(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'plan' => ['required', Rule::in(Plan::allNames())],
        ]);

        $plan = Plan::where('name', $request->plan)->firstOrFail();

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

    public function resendVerification(User $user): JsonResponse
    {
        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success'    => false,
                'message'    => 'E-mail já verificado.',
                'error_code' => 'EMAIL_ALREADY_VERIFIED',
            ], 400);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'E-mail de verificação reenviado com sucesso.',
        ]);
    }

    public function verifyEmail(User $user): JsonResponse
    {
        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'success'    => false,
                'message'    => 'E-mail já verificado.',
                'error_code' => 'EMAIL_ALREADY_VERIFIED',
            ], 400);
        }

        $user->markEmailAsVerified();

        return response()->json([
            'success' => true,
            'data'    => ['email_verified_at' => $user->fresh()->email_verified_at],
            'message' => 'E-mail verificado manualmente com sucesso.',
        ]);
    }

    public function sendPasswordReset(User $user): JsonResponse
    {
        $token = Password::createToken($user);
        Mail::to($user->email)->send(new PasswordResetMail($token, $user->email));

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Link de redefinição de senha enviado ao usuário.',
        ]);
    }
}
