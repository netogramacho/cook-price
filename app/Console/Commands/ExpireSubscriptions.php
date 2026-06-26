<?php

namespace App\Console\Commands;

use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:expire-subscriptions')]
#[Description('Reverte para Free usuários cujo período pago expirou')]
class ExpireSubscriptions extends Command
{
    public function handle(): void
    {
        $freePlan = Plan::free();

        $expired = Subscription::where('cancel_at_period_end', true)
            ->where('ends_at', '<=', now())
            ->with('user')
            ->get();

        $downgraded = 0;

        foreach ($expired as $subscription) {
            $user = $subscription->user;

            // Assinatura antiga que já não corresponde ao plano atual do usuário
            // (ex.: trocou ou reassinou): não governa mais o acesso. Marca como
            // processada para não reincidir nas próximas execuções e segue.
            if (!$user || $user->plan_id !== $subscription->plan_id) {
                $subscription->update(['cancel_at_period_end' => false]);
                continue;
            }

            $subscription->update([
                'mp_status'            => 'cancelled',
                'cancel_at_period_end' => false, // processada: sai da fila de candidatas
                'ends_at'              => now(),
            ]);

            $user->plan_id = $freePlan->id;
            $user->save();
            $downgraded++;
        }

        $this->info("Rebaixadas para Free: {$downgraded} de {$expired->count()} assinatura(s) vencida(s).");
    }
}
