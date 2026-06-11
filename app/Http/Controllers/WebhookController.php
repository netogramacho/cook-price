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

        $preapproval     = $this->mp->getPreapproval($preapprovalId);
        $nextPaymentDate = isset($preapproval['next_payment_date'])
            ? \Carbon\Carbon::parse($preapproval['next_payment_date'])
            : null;

        $subscription->update([
            'current_period_end'   => $nextPaymentDate,
            'cancel_at_period_end' => false,
        ]);

        $this->mp->logIncomingWebhook($request, true);
    }

    private function handleAuthorized(Subscription $subscription, array $preapproval): void
    {
        $nextPaymentDate = isset($preapproval['next_payment_date'])
            ? \Carbon\Carbon::parse($preapproval['next_payment_date'])
            : null;

        $subscription->update([
            'mp_status'          => 'authorized',
            'starts_at'          => now(),
            'cancel_at_period_end' => false,
            'current_period_end' => $nextPaymentDate,
        ]);

        $user = $subscription->user;
        if ($user->plan_id !== $subscription->plan_id) {
            $user->plan_id = $subscription->plan_id;
            $user->save();
        }

        Mail::to($user->email)->queue(new SubscriptionActivated($user, $subscription->plan));
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
        $subscription->update(['mp_status' => 'paused']);
    }
}
