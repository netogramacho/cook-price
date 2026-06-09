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
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if ($request->input('type') !== 'preapproval') {
            $this->mp->logIncomingWebhook($request, true);
            return response()->json(['message' => 'OK'], 200);
        }

        $preapprovalId = $request->input('data.id');

        if (!$preapprovalId) {
            $this->mp->logIncomingWebhook($request, false, 'data.id ausente no payload.');
            return response()->json(['message' => 'OK'], 200);
        }

        $subscription = Subscription::where('mp_preapproval_id', $preapprovalId)->first();

        if (!$subscription) {
            $this->mp->logIncomingWebhook($request, false, "Preapproval {$preapprovalId} não encontrado localmente.");
            return response()->json(['message' => 'OK'], 200);
        }

        try {
            $preapproval = $this->mp->getPreapproval($preapprovalId);
        } catch (\RuntimeException $e) {
            $this->mp->logIncomingWebhook($request, false, $e->getMessage());
            return response()->json(['message' => 'OK'], 200);
        }

        $mpStatus = $preapproval['status'] ?? null;

        match ($mpStatus) {
            'authorized' => $this->handleAuthorized($subscription),
            'cancelled'  => $this->handleCancelled($subscription),
            'paused'     => $this->handlePaused($subscription),
            default      => null,
        };

        $this->mp->logIncomingWebhook($request, true);

        return response()->json(['message' => 'OK'], 200);
    }

    private function handleAuthorized(Subscription $subscription): void
    {
        $subscription->update([
            'mp_status' => 'authorized',
            'starts_at' => now(),
            'ends_at'   => now()->addMonth(),
        ]);

        $user          = $subscription->user;
        $user->plan_id = $subscription->plan_id;
        $user->save();
    }

    private function handleCancelled(Subscription $subscription): void
    {
        $subscription->update([
            'mp_status' => 'cancelled',
            'ends_at'   => now(),
        ]);

        $freePlanId    = Plan::where('name', 'free')->value('id');
        $user          = $subscription->user;
        $user->plan_id = $freePlanId;
        $user->save();
    }

    private function handlePaused(Subscription $subscription): void
    {
        $subscription->update(['mp_status' => 'paused']);
    }
}
