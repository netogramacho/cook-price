<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            // URL de checkout (init_point) retornada pelo MP ao criar a preapproval.
            // Guardada para retomar um checkout pendente em vez de criar outra.
            $table->text('checkout_url')->nullable()->after('mp_status');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('checkout_url');
        });
    }
};
