<?php

namespace App\Http\Controllers;

use App\Mail\SubscriptionActivated;
use App\Mail\SubscriptionCancelledByPaymentFailure;
use App\Models\Plan;
use App\Models\Subscription;
use App\Services\MercadoPagoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class WebhookController extends Controller
{
    public function __construct(private MercadoPagoService $mp) {}

    public function handleMercadoPago(Request $request): JsonResponse
    {
        if (!$this->mp->validateWebhookSignature($request)) {
            $this->mp->logIncomingWebhook($request, false, 'Assinatura inválida.');
            return response()->json(['success' => false], 401);
        }

        $type       = $request->input('type');
        $resourceId = $request->input('data.id');

        if (!$resourceId || !in_array($type, ['subscription_preapproval', 'subscription_authorized_payment'])) {
            $this->mp->logIncomingWebhook($request, true);
            return response()->json(['success' => true]);
        }

        try {
            if ($type === 'subscription_authorized_payment') {
                $this->processAuthorizedPayment($request, $resourceId);
                return response()->json(['success' => true]);
            }

            $preapproval  = $this->mp->getPreapproval($resourceId);
            $subscription = Subscription::where('mp_preapproval_id', $resourceId)->first();

            if (!$subscription) {
                $this->mp->logIncomingWebhook($request, false, "Assinatura não encontrada: {$resourceId}");
                return response()->json(['success' => false], 404);
            }

            $mpStatus = $preapproval['status'] ?? null;

            match ($mpStatus) {
                'authorized'            => $this->handleAuthorized($subscription, $preapproval),
                'cancelled', 'canceled' => $this->handleCancelled($subscription),
                'paused'                => $this->handlePaused($subscription),
                default                 => null,
            };
        } catch (\RuntimeException $e) {
            $this->mp->logIncomingWebhook($request, false, $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
        }

        $this->mp->logIncomingWebhook($request, true);

        return response()->json(['success' => true]);
    }

    private function processAuthorizedPayment(\Illuminate\Http\Request $request, string $authorizedPaymentId): void
    {
        $payment      = $this->mp->getAuthorizedPayment($authorizedPaymentId);
        $preapprovalId = $payment['preapproval_id'] ?? null;

        if (!$preapprovalId) {
            $this->mp->logIncomingWebhook($request, false, "preapproval_id ausente no pagamento: {$authorizedPaymentId}");
            return;
        }

        $subscription = Subscription::where('mp_preapproval_id', $preapprovalId)->first();

        if (!$subscription) {
            $this->mp->logIncomingWebhook($request, false, "Assinatura não encontrada para preapproval: {$preapprovalId}");
            return;
        }

        $preapproval = $this->mp->getPreapproval($preapprovalId);

        // Fonte da verdade e o status atual da preapproval no MP, nao o nosso estado
        // local. Um authorized_payment atrasado/reentregue sobre uma preapproval que
        // ja nao esta ativa (usuario cancelou pelo app, ou o MP encerrou) e ignorado:
        // nao ha cobranca legitima, entao nao ressuscita o acesso — evita acesso pago
        // gratuito perpetuo por webhook fora de ordem.
        if (($preapproval['status'] ?? null) !== 'authorized') {
            $this->mp->logIncomingWebhook($request, true, "Pagamento ignorado: preapproval {$preapprovalId} nao esta ativa no MP.");
            return;
        }

        $nextPaymentDate = isset($preapproval['next_payment_date'])
            ? \Carbon\Carbon::parse($preapproval['next_payment_date'])
            : null;

        // Pagamento confirmado reativa/renova a assinatura: reverte a pausa, atualiza
        // o periodo e garante o usuario no plano pago (ex.: trocou o cartao e pagou
        // apos uma pausa que ja havia rebaixado para Free).
        $subscription->update([
            'mp_status'            => 'authorized',
            'ends_at'              => $nextPaymentDate,
            'cancel_at_period_end' => false,
        ]);

        $user = $subscription->user;
        if ($user && $user->plan_id !== $subscription->plan_id) {
            $user->plan_id = $subscription->plan_id;
            $user->save();
        }

        $this->mp->logIncomingWebhook($request, true);
    }

    private function handleAuthorized(Subscription $subscription, array $preapproval): void
    {
        // Ignora webhook de assinatura superada: se existe outra assinatura mais
        // recente para o mesmo usuario (troca de plano, reassinatura), ela e quem
        // governa o plano. Sem isto, um webhook fora de ordem de uma assinatura
        // antiga regravaria o plano errado — o MP nao garante ordem de entrega.
        $hasNewer = Subscription::where('user_id', $subscription->user_id)
            ->where('created_at', '>', $subscription->created_at)
            ->exists();

        if ($hasNewer) {
            return;
        }

        // Idempotencia: se a assinatura ja esta authorized, esta e uma reentrega do
        // mesmo evento (o MP reenvia rotineiramente). Nao reseta starts_at nem
        // reenvia o e-mail de ativacao — so a transicao para authorized conta como
        // primeira ativacao.
        $isFirstActivation = $subscription->mp_status !== 'authorized';

        $nextPaymentDate = isset($preapproval['next_payment_date'])
            ? \Carbon\Carbon::parse($preapproval['next_payment_date'])
            : null;

        $data = [
            'mp_status'            => 'authorized',
            'cancel_at_period_end' => false,
            'ends_at'              => $nextPaymentDate,
        ];

        // starts_at so na primeira ativacao — preserva a janela de acesso original,
        // usada em SubscriptionController::cancel() para calcular o fim do periodo.
        if ($isFirstActivation) {
            $data['starts_at'] = now();
        }

        $subscription->update($data);

        $user = $subscription->user;
        if ($user->plan_id !== $subscription->plan_id) {
            $user->plan_id = $subscription->plan_id;
            $user->save();
        }

        // E-mail de ativacao apenas uma vez, na primeira ativacao (evita duplicados
        // a cada reentrega do webhook).
        if ($isFirstActivation) {
            Mail::to($user->email)->queue(new SubscriptionActivated($user, $subscription->plan));
        }
    }

    private function handleCancelled(Subscription $subscription): void
    {
        if ($subscription->mp_status === 'cancelled') {
            return;
        }

        // Se foi o usuário que cancelou pelo app, o acesso já está controlado pelo
        // comando app:expire-subscriptions — não reverte o plano agora.
        if ($subscription->cancel_at_period_end) {
            return;
        }

        // Cancelamento iniciado pelo MP (ex: falha de pagamento) — reverte imediatamente.
        $subscription->update([
            'mp_status' => 'cancelled',
            'ends_at'   => now(),
        ]);

        $freePlan      = Plan::free();
        $user          = $subscription->user;
        $user->plan_id = $freePlan->id;
        $user->save();

        Mail::to($user->email)->queue(new SubscriptionCancelledByPaymentFailure($user));
    }

    private function handlePaused(Subscription $subscription): void
    {
        // Idempotente: reentregas do mesmo evento nao reprocessam.
        if ($subscription->mp_status === 'paused') {
            return;
        }

        // O MP pausa apos falhas de cobranca (ex.: cartao expirado). Mantem o acesso
        // ate o fim do periodo ja pago (ends_at) e coloca a assinatura no radar do
        // cron: se o pagamento nao for regularizado, app:expire-subscriptions rebaixa
        // para Free ao expirar. Se o cartao for atualizado e o MP voltar a cobrar, o
        // webhook authorized_payment reativa a assinatura.
        $subscription->update([
            'mp_status'            => 'paused',
            'cancel_at_period_end' => true,
            'ends_at'              => $subscription->ends_at ?? now(),
        ]);
    }
}
