<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\User;
use App\Services\MercadoPagoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MpSubscriptionController extends Controller
{
    public function __construct(private MercadoPagoService $mp) {}

    /**
     * Lista assinaturas (preapprovals) buscando direto na API do MercadoPago e
     * correlaciona cada uma com o usuário local. Paginação via MP (limit/offset).
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(['authorized', 'paused', 'pending', 'cancelled'])],
            'limit'  => ['nullable', 'integer', 'min:1', 'max:100'],
            'offset' => ['nullable', 'integer', 'min:0'],
        ]);

        $limit  = (int) ($validated['limit'] ?? 50);
        $offset = (int) ($validated['offset'] ?? 0);

        $filters = [
            'limit'  => $limit,
            'offset' => $offset,
        ];

        // Sem status = todas; padrão da tela é 'authorized' (enviado pelo frontend).
        if (!empty($validated['status'])) {
            $filters['status'] = $validated['status'];
        }

        try {
            $result = $this->mp->searchPreapprovals($filters);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success'    => false,
                'message'    => $e->getMessage(),
                'error_code' => 'MP_ERROR',
            ], 502);
        }

        $results = $result['results'] ?? [];
        $items   = array_map(fn ($preapproval) => $this->present($preapproval), $results);

        $paging = $result['paging'] ?? [];

        return response()->json([
            'success' => true,
            'data'    => [
                'items'  => $items,
                'paging' => [
                    'total'  => (int) ($paging['total'] ?? count($items)),
                    'limit'  => (int) ($paging['limit'] ?? $limit),
                    'offset' => (int) ($paging['offset'] ?? $offset),
                ],
            ],
            'message' => 'Assinaturas do MercadoPago carregadas.',
        ]);
    }

    /**
     * Cancela uma preapproval direto no MercadoPago (pela tela de assinaturas do MP).
     * Se houver assinatura local vinculada, reconcilia o estado mantendo o acesso até
     * o fim do período pago — mesma semântica do cancelamento do painel de usuários.
     */
    public function cancel(string $preapproval): JsonResponse
    {
        try {
            $this->mp->cancelPreapproval($preapproval);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success'    => false,
                'message'    => $e->getMessage(),
                'error_code' => 'MP_ERROR',
            ], 502);
        }

        $subscription = Subscription::where('mp_preapproval_id', $preapproval)->first();

        if ($subscription && $subscription->mp_status !== 'cancelled') {
            $endsAt = $subscription->ends_at
                ?? ($subscription->starts_at ? $subscription->starts_at->addMonth() : now()->addMonth());

            $subscription->update([
                'mp_status'            => 'cancelled',
                'cancel_at_period_end' => true,
                'ends_at'              => $endsAt,
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => ['linked_subscription' => (bool) $subscription],
            'message' => 'Assinatura cancelada no MercadoPago.',
        ]);
    }

    /**
     * Normaliza a preapproval do MP e anexa o usuário local correlacionado
     * (por mp_preapproval_id; fallback por payer_email).
     */
    private function present(array $preapproval): array
    {
        $id         = $preapproval['id'] ?? null;
        $payerEmail = $preapproval['payer_email'] ?? null;

        $localUser = $this->resolveLocalUser($id, $payerEmail);

        return [
            'id'                => $id,
            'status'            => $preapproval['status'] ?? null,
            'reason'            => $preapproval['reason'] ?? null,
            'payer_email'       => $payerEmail,
            'amount'            => $preapproval['auto_recurring']['transaction_amount'] ?? null,
            'currency_id'       => $preapproval['auto_recurring']['currency_id'] ?? null,
            'date_created'      => $preapproval['date_created'] ?? null,
            'next_payment_date' => $preapproval['next_payment_date'] ?? null,
            'local_user'        => $localUser,
        ];
    }

    private function resolveLocalUser(?string $preapprovalId, ?string $payerEmail): ?array
    {
        $user = null;

        if ($preapprovalId) {
            $subscription = Subscription::where('mp_preapproval_id', $preapprovalId)->with('user')->first();
            $user = $subscription?->user;
        }

        if (!$user && $payerEmail) {
            $user = User::where('email', $payerEmail)->first();
        }

        if (!$user) {
            return null;
        }

        return [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
        ];
    }
}
