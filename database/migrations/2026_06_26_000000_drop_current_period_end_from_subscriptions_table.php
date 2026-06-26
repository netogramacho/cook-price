<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Backfill defensivo: garante que nenhuma data de fim de acesso se perca
        // ao remover a coluna (ends_at passa a ser a única fonte de verdade).
        DB::table('subscriptions')
            ->whereNull('ends_at')
            ->whereNotNull('current_period_end')
            ->update(['ends_at' => DB::raw('current_period_end')]);

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('current_period_end');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->timestamp('current_period_end')->nullable()->after('ends_at');
        });
    }
};
