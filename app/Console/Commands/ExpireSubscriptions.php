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

            // Não rebaixar quem já trocou de plano (ex.: pagou durante o período).
            if (!$user || $user->plan_id !== $subscription->plan_id) {
                continue;
            }

            $subscription->update([
                'mp_status' => 'cancelled',
                'ends_at'   => now(),
            ]);

            $user->plan_id = $freePlan->id;
            $user->save();
            $downgraded++;
        }

        $this->info("Rebaixadas para Free: {$downgraded} de {$expired->count()} assinatura(s) vencida(s).");
    }
}
