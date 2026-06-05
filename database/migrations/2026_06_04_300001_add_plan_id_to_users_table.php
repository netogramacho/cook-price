<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignUuid('plan_id')
                ->nullable()
                ->after('email_verified_at')
                ->constrained('plans');
        });

        // Todos os usuários existentes entram no plano Gratuito (opção B)
        DB::table('users')->whereNull('plan_id')->update([
            'plan_id' => '6f262479-2c69-46be-9eb6-4b86a7e8c237',
        ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['plan_id']);
            $table->dropColumn('plan_id');
        });
    }
};
