<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use App\Services\MercadoPagoService;
use App\Services\SubscriptionReconciler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookController extends Controller
{
    public function __construct(
        private MercadoPagoService $mp,
        private SubscriptionReconciler $reconciler,
    ) {}

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

            $this->reconciler->applyPreapprovalStatus($subscription, $preapproval);
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
}
