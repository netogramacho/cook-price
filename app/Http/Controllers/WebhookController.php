<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Subscription;
use App\Services\MercadoPagoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        if ($type !== 'preapproval' || !$resourceId) {
            $this->mp->logIncomingWebhook($request, true);
            return response()->json(['success' => true]);
        }

        try {
            $preapproval = $this->mp->getPreapproval($resourceId);
        } catch (\RuntimeException $e) {
            $this->mp->logIncomingWebhook($request, false, $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
        }

        $subscription = Subscription::where('mp_preapproval_id', $resourceId)->first();

        if (!$subscription) {
            $this->mp->logIncomingWebhook($request, false, "Assinatura não encontrada: {$resourceId}");
            return response()->json(['success' => false], 404);
        }

        $mpStatus = $preapproval['status'] ?? null;

        match ($mpStatus) {
            'authorized' => $this->handleAuthorized($subscription, $preapproval),
            'cancelled', 'canceled' => $this->handleCancelled($subscription),
            'paused'    => $this->handlePaused($subscription),
            default     => null,
        };

        $this->mp->logIncomingWebhook($request, true);

        return response()->json(['success' => true]);
    }

    private function handleAuthorized(Subscription $subscription, array $preapproval): void
    {
        $subscription->update([
            'mp_status' => 'authorized',
            'starts_at' => now(),
        ]);

        $user = $subscription->user;
        if ($user->plan_id !== $subscription->plan_id) {
            $user->plan_id = $subscription->plan_id;
            $user->save();
        }
    }

    private function handleCancelled(Subscription $subscription): void
    {
        if ($subscription->mp_status === 'cancelled') {
            return;
        }

        $subscription->update([
            'mp_status' => 'cancelled',
            'ends_at'   => now(),
        ]);

        $freePlan              = Plan::where('name', 'free')->first();
        $user                  = $subscription->user;
        $user->plan_id         = $freePlan->id;
        $user->save();
    }

    private function handlePaused(Subscription $subscription): void
    {
        $subscription->update(['mp_status' => 'paused']);
    }
}
