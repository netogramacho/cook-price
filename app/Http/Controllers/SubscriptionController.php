<?php

namespace App\Http\Controllers;

use App\Http\Requests\Subscription\StoreSubscriptionRequest;
use App\Mail\SubscriptionCancelledByUser;
use App\Models\Plan;
use App\Models\Subscription;
use App\Services\MercadoPagoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class SubscriptionController extends Controller
{
    public function __construct(private MercadoPagoService $mp) {}

    public function current(Request $request): JsonResponse
    {
        $user         = $request->user()->load('plan');
        $subscription = Subscription::where('user_id', $user->id)
            ->with('plan')
            ->latest()
            ->first();

        return response()->json([
            'success' => true,
            'data'    => [
                'plan'         => $user->plan,
                'subscription' => $subscription,
            ],
            'message' => 'Dados de assinatura carregados.',
        ]);
    }

    public function store(StoreSubscriptionRequest $request): JsonResponse
    {
        $user = $request->user()->load('plan');

        if ($user->plan->name === $request->plan) {
            return response()->json([
                'success'    => false,
                'message'    => 'Você já está neste plano.',
                'error_code' => 'SAME_PLAN',
            ], 422);
        }

        $activeSubscription = Subscription::where('user_id', $user->id)
            ->where('mp_status', 'authorized')
            ->first();

        $plan = Plan::where('name', $request->plan)->firstOrFail();

        try {
            if ($activeSubscription) {
                $this->mp->cancelPreapproval($activeSubscription->mp_preapproval_id);
                $activeSubscription->update([
                    'mp_status' => 'cancelled',
                    'ends_at'   => now(),
                ]);
            }

            $preapproval = $this->mp->createPreapproval($user, $plan);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success'    => false,
                'message'    => $e->getMessage(),
                'error_code' => 'MP_ERROR',
            ], 502);
        }

        Subscription::create([
            'user_id'           => $user->id,
            'plan_id'           => $plan->id,
            'mp_preapproval_id' => $preapproval['id'],
            'mp_status'         => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'checkout_url' => $preapproval['init_point'],
            ],
            'message' => 'Redirecionando para o checkout.',
        ]);
    }

    public function cancel(Request $request): JsonResponse
    {
        $user         = $request->user();
        $subscription = Subscription::where('user_id', $user->id)
            ->where('mp_status', 'authorized')
            ->first();

        if (!$subscription) {
            return response()->json([
                'success'    => false,
                'message'    => 'Nenhuma assinatura ativa encontrada.',
                'error_code' => 'NO_ACTIVE_SUBSCRIPTION',
            ], 404);
        }

        try {
            $this->mp->cancelPreapproval($subscription->mp_preapproval_id);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success'    => false,
                'message'    => $e->getMessage(),
                'error_code' => 'MP_ERROR',
            ], 502);
        }

        $endsAt = $subscription->ends_at
            ?? ($subscription->starts_at ? $subscription->starts_at->addMonth() : now()->addMonth());

        $subscription->update([
            'mp_status'            => 'cancelled',
            'cancel_at_period_end' => true,
            'ends_at'              => $endsAt,
        ]);

        Mail::to($user->email)->queue(new SubscriptionCancelledByUser($user, $endsAt));

        return response()->json([
            'success' => true,
            'data'    => ['ends_at' => $endsAt],
            'message' => 'Assinatura cancelada. Você ainda tem acesso ao plano até ' . $endsAt->format('d/m/Y') . '.',
        ]);
    }
}
