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
        $user = $request->user()->load('plan');

        // Assinatura VIGENTE (a que governa o acesso): exclui 'pending' (checkout em
        // andamento vive em currentPending) e prioriza authorized > paused > cancelled.
        // Assim uma pending nunca mascara a assinatura ativa/estado real (#13).
        $subscription = Subscription::where('user_id', $user->id)
            ->where('mp_status', '!=', 'pending')
            ->with('plan')
            ->orderByRaw("FIELD(mp_status, 'authorized', 'paused', 'cancelled')")
            ->orderByDesc('created_at')
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

    public function currentPending(Request $request): JsonResponse
    {
        $user = $request->user();

        // Checkout em andamento (se houver). Separado da vigente para o polling
        // "aguardando pagamento" e para nao mascarar o estado real na tela.
        $pending = Subscription::where('user_id', $user->id)
            ->where('mp_status', 'pending')
            ->with('plan')
            ->latest()
            ->first();

        return response()->json([
            'success' => true,
            'data'    => ['subscription' => $pending],
            'message' => 'Checkout pendente carregado.',
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

            // Retoma o checkout de uma pending recente do MESMO plano (< 24h) em vez de
            // criar outra preapproval — evita acumular checkouts orfaos.
            $resumable = Subscription::where('user_id', $user->id)
                ->where('plan_id', $plan->id)
                ->where('mp_status', 'pending')
                ->whereNotNull('checkout_url')
                ->where('created_at', '>', now()->subDay())
                ->latest()
                ->first();

            if ($resumable) {
                return response()->json([
                    'success' => true,
                    'data'    => ['checkout_url' => $resumable->checkout_url],
                    'message' => 'Retomando o checkout iniciado anteriormente.',
                ]);
            }

            // Sem checkout retomavel: todas as pendings existentes (stale do mesmo plano
            // ou de outros planos) serao canceladas para nao deixar checkouts vivos.
            $stalePendings = Subscription::where('user_id', $user->id)
                ->where('mp_status', 'pending')
                ->get();

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

            // Cancela no MP os checkouts abandonados (best-effort: uma pending morta ou
            // expirada nao deve impedir o novo checkout).
            foreach ($stalePendings as $stale) {
                if (!$stale->mp_preapproval_id) {
                    continue;
                }
                try {
                    $this->mp->cancelPreapproval($stale->mp_preapproval_id);
                } catch (\RuntimeException $e) {
                    // ignorado de proposito
                }
            }

            DB::transaction(function () use ($user, $plan, $preapproval, $activeSubscription, $stalePendings) {
                Subscription::create([
                    'user_id'           => $user->id,
                    'plan_id'           => $plan->id,
                    'mp_preapproval_id' => $preapproval['id'],
                    'mp_status'         => 'pending',
                    'checkout_url'      => $preapproval['init_point'],
                ]);

                foreach ($stalePendings as $stale) {
                    $stale->update(['mp_status' => 'cancelled']);
                }

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
