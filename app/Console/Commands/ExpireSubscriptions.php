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
        $freePlan = Plan::where('name', 'free')->firstOrFail();

        $expired = Subscription::where('cancel_at_period_end', true)
            ->where('current_period_end', '<=', now())
            ->with('user')
            ->get();

        foreach ($expired as $subscription) {
            $subscription->update([
                'mp_status' => 'cancelled',
                'ends_at'   => now(),
            ]);

            $user           = $subscription->user;
            $user->plan_id  = $freePlan->id;
            $user->save();
        }

        $this->info("Expiradas: {$expired->count()} assinatura(s).");
    }
}
