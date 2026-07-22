<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Índices para as queries quentes de assinatura (auditoria #15):
     *  - Cron ExpireSubscriptions: WHERE cancel_at_period_end = ? AND ends_at <= ?
     *  - SubscriptionController::store: WHERE user_id = ? AND mp_status = ?
     */
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->index(['cancel_at_period_end', 'ends_at'], 'subscriptions_cancel_ends_index');
            $table->index(['user_id', 'mp_status'], 'subscriptions_user_status_index');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex('subscriptions_cancel_ends_index');
            $table->dropIndex('subscriptions_user_status_index');
        });
    }
};
