<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Subscription;
use App\Services\MercadoPagoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function __construct(private MercadoPagoService $mp) {}

    public function handleMercadoPago(Request $request): JsonResponse
    {
        if (!$this->mp->validateWebhookSignature($request)) {
            Log::warning('Webhook MP: assinatura inválida', [
                'ip'      => $request->ip(),
                'payload' => $request->all(),
            ]);
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if ($request->input('type') !== 'preapproval') {
            return response()->json(['message' => 'OK'], 200);
        }

        $preapprovalId = $request->input('data.id');

        if (!$preapprovalId) {
            return response()->json(['message' => 'OK'], 200);
        }

        $subscription = Subscription::where('mp_preapproval_id', $preapprovalId)->first();

        if (!$subscription) {
            Log::info('Webhook MP: preapproval não encontrado localmente', [
                'preapproval_id' => $preapprovalId,
            ]);
            return response()->json(['message' => 'OK'], 200);
        }

        try {
            $preapproval = $this->mp->getPreapproval($preapprovalId);
        } catch (\RuntimeException $e) {
            Log::error('Webhook MP: erro ao buscar preapproval', [
                'preapproval_id' => $preapprovalId,
                'error'          => $e->getMessage(),
            ]);
            // Retorna 200 para o MP não retentar indefinidamente
            return response()->json(['message' => 'OK'], 200);
        }

        $mpStatus = $preapproval['status'] ?? null;

        match ($mpStatus) {
            'authorized' => $this->handleAuthorized($subscription),
            'cancelled'  => $this->handleCancelled($subscription),
            'paused'     => $this->handlePaused($subscription),
            default      => Log::info('Webhook MP: status não tratado', ['status' => $mpStatus]),
        };

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
        $user->save(); // dispara UserObserver
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
        $user->save(); // dispara UserObserver
    }

    private function handlePaused(Subscription $subscription): void
    {
        $subscription->update(['mp_status' => 'paused']);
    }
}
