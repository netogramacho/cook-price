<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_onboardings', function (Blueprint $table) {
            $table->boolean('created_insumo')->default(false)->after('created_ingredient');
            $table->boolean('created_product')->default(false)->after('created_recipe');
        });

        // Backfill a partir dos dados reais (produtos ainda não existem aqui; a
        // migração de receitas->produtos roda depois e marca via ProductObserver).
        DB::table('user_onboardings')->orderBy('id')->pluck('user_id', 'id')->each(function ($user_id, $id) {
            DB::table('user_onboardings')->where('id', $id)->update([
                'created_insumo'  => DB::table('ingredients')->where('user_id', $user_id)->where('active', true)->where('type', 'insumo')->exists(),
                'created_product' => DB::table('products')->where('user_id', $user_id)->where('active', true)->exists(),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('user_onboardings', function (Blueprint $table) {
            $table->dropColumn(['created_insumo', 'created_product']);
        });
    }
};
