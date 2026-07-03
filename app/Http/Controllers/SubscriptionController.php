<?php

namespace App\Http\Controllers;

use App\Http\Requests\Subscription\StoreSubscriptionRequest;
use App\Mail\SubscriptionCancelledByUser;
use App\Models\Plan;
use App\Models\Subscription;
use App\Services\MercadoPagoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
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

        // Lock por usuario: impede que duplo clique ou requests concorrentes leiam o
        // mesmo estado e criem duas preapprovals + duas assinaturas pending (cobranca
        // duplicada). Enquanto uma operacao esta em andamento, as demais sao recusadas.
        $lock = Cache::lock("subscription:{$user->id}", 15);

        if (!$lock->get()) {
            return response()->json([
                'success'    => false,
                'message'    => 'Já existe uma operação de assinatura em andamento. Aguarde um instante e tente novamente.',
                'error_code' => 'SUBSCRIPTION_IN_PROGRESS',
            ], 409);
        }

        try {
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

            // Downgrade (migrar para um plano mais barato) nao e permitido: o usuario
            // deve cancelar e deixar expirar. Comparacao por preco cobre qualquer plano
            // pago futuro sem depender do nome.
            if ($plan->price < $user->plan->price) {
                return response()->json([
                    'success'    => false,
                    'message'    => 'Não é possível migrar para um plano inferior. Cancele a assinatura atual para voltar ao plano gratuito.',
                    'error_code' => 'DOWNGRADE_NOT_ALLOWED',
                ], 422);
            }

            try {
                // Cria a nova preapproval ANTES de mexer na antiga. Se isto falhar, a
                // assinatura antiga segue ativa e cobrando — sem deixar estado orfao.
                $preapproval = $this->mp->createPreapproval($user, $plan);

                if ($activeSubscription) {
                    $this->mp->cancelPreapproval($activeSubscription->mp_preapproval_id);
                }
            } catch (\RuntimeException $e) {
                return response()->json([
                    'success'    => false,
                    'message'    => $e->getMessage(),
                    'error_code' => 'MP_ERROR',
                ], 502);
            }

            DB::transaction(function () use ($user, $plan, $preapproval, $activeSubscription) {
                Subscription::create([
                    'user_id'           => $user->id,
                    'plan_id'           => $plan->id,
                    'mp_preapproval_id' => $preapproval['id'],
                    'mp_status'         => 'pending',
                ]);

                if ($activeSubscription) {
                    // cancel_at_period_end=true devolve a antiga ao radar do cron
                    // (evita assinatura orfa); ends_at preservado nao descarta o
                    // periodo ja pago.
                    $activeSubscription->update([
                        'mp_status'            => 'cancelled',
                        'cancel_at_period_end' => true,
                        'ends_at'              => $activeSubscription->ends_at
                            ?? ($activeSubscription->starts_at
                                ? $activeSubscription->starts_at->addMonth()
                                : now()->addMonth()),
                    ]);
                }
            });

            return response()->json([
                'success' => true,
                'data'    => [
                    'checkout_url' => $preapproval['init_point'],
                ],
                'message' => 'Redirecionando para o checkout.',
            ]);
        } finally {
            $lock->release();
        }
    }

    public function cancel(Request $request): JsonResponse
    {
        $user = $request->user();

        // Mesmo lock do store: serializa cancelamento vs. assinatura concorrentes e
        // evita duplo cancelamento (dois e-mails / duas chamadas ao MP) por duplo clique.
        $lock = Cache::lock("subscription:{$user->id}", 15);

        if (!$lock->get()) {
            return response()->json([
                'success'    => false,
                'message'    => 'Já existe uma operação de assinatura em andamento. Aguarde um instante e tente novamente.',
                'error_code' => 'SUBSCRIPTION_IN_PROGRESS',
            ], 409);
        }

        try {
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
        } finally {
            $lock->release();
        }
    }
}
