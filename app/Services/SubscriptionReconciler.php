<?php

namespace App\Services;

use App\Mail\SubscriptionActivated;
use App\Mail\SubscriptionCancelledByPaymentFailure;
use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Support\Facades\Mail;

/**
 * Aplica o status de uma preapproval do MercadoPago a uma assinatura local.
 *
 * Fonte única da verdade para reconciliação de assinaturas: usado pelo webhook
 * (fluxo normal) e pelo painel admin (sync manual quando o webhook falha). Toda a
 * lógica de idempotência e ordenação vive aqui — não duplicar nas chamadas.
 */
class SubscriptionReconciler
{
    public function applyPreapprovalStatus(Subscription $subscription, array $preapproval): void
    {
        $mpStatus = $preapproval['status'] ?? null;

        match ($mpStatus) {
            'authorized'            => $this->handleAuthorized($subscription, $preapproval),
            'cancelled', 'canceled' => $this->handleCancelled($subscription),
            'paused'                => $this->handlePaused($subscription),
            default                 => null,
        };
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
