<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Services\MercadoPagoService;
use App\Services\SubscriptionReconciler;
use Illuminate\Http\JsonResponse;

class SubscriptionController extends Controller
{
    public function __construct(
        private MercadoPagoService $mp,
        private SubscriptionReconciler $reconciler,
    ) {}

    /**
     * Cancela uma assinatura pelo painel. Espelha SubscriptionController::cancel
     * (fluxo do usuário): cancela no MP e mantém o acesso até o fim do período pago,
     * deixando o rebaixamento a cargo do cron app:expire-subscriptions.
     */
    public function cancel(Subscription $subscription): JsonResponse
    {
        if ($subscription->mp_status === 'cancelled') {
            return response()->json([
                'success'    => false,
                'message'    => 'Esta assinatura já está cancelada.',
                'error_code' => 'ALREADY_CANCELLED',
            ], 422);
        }

        if ($subscription->mp_preapproval_id) {
            try {
                $this->mp->cancelPreapproval($subscription->mp_preapproval_id);
            } catch (\RuntimeException $e) {
                return response()->json([
                    'success'    => false,
                    'message'    => $e->getMessage(),
                    'error_code' => 'MP_ERROR',
                ], 502);
            }
        }

        $endsAt = $subscription->ends_at
            ?? ($subscription->starts_at ? $subscription->starts_at->addMonth() : now()->addMonth());

        $subscription->update([
            'mp_status'            => 'cancelled',
            'cancel_at_period_end' => true,
            'ends_at'              => $endsAt,
        ]);

        return response()->json([
            'success' => true,
            'data'    => ['ends_at' => $endsAt],
            'message' => 'Assinatura cancelada. Acesso mantido até ' . $endsAt->format('d/m/Y') . '.',
        ]);
    }

    /**
     * Reconsulta o status real da assinatura no MercadoPago e reconcilia o estado
     * local. Use quando um webhook falhou e o registro ficou dessincronizado.
     */
    public function sync(Subscription $subscription): JsonResponse
    {
        if (!$subscription->mp_preapproval_id) {
            return response()->json([
                'success'    => false,
                'message'    => 'Assinatura sem preapproval no MercadoPago (nada a sincronizar).',
                'error_code' => 'NO_PREAPPROVAL',
            ], 422);
        }

        try {
            $preapproval = $this->mp->getPreapproval($subscription->mp_preapproval_id);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success'    => false,
                'message'    => $e->getMessage(),
                'error_code' => 'MP_ERROR',
            ], 502);
        }

        $this->reconciler->applyPreapprovalStatus($subscription, $preapproval);

        $fresh = $subscription->fresh(['plan'])
            ->makeVisible(['mp_preapproval_id', 'created_at', 'updated_at']);

        return response()->json([
            'success' => true,
            'data'    => [
                'mp_status'    => $preapproval['status'] ?? null,
                'subscription' => $fresh,
            ],
            'message' => 'Assinatura sincronizada com o MercadoPago.',
        ]);
    }
}
