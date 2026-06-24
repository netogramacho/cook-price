<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_onboardings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->unique()->constrained()->onDelete('cascade');
            $table->boolean('created_ingredient')->default(false);
            $table->boolean('created_recipe')->default(false);
            $table->boolean('registered_production')->default(false);
            $table->boolean('dismissed')->default(false);
            $table->timestamps();
        });

        // Backfill: cria uma linha de onboarding para cada usuário existente,
        // pré-marcando os passos a partir dos dados reais.
        $now = now();

        DB::table('users')->orderBy('id')->pluck('id')->each(function ($user_id) use ($now) {
            DB::table('user_onboardings')->insert([
                'id'                    => (string) Str::uuid(),
                'user_id'               => $user_id,
                'created_ingredient'    => DB::table('ingredients')->where('user_id', $user_id)->where('active', true)->exists(),
                'created_recipe'        => DB::table('recipes')->where('user_id', $user_id)->where('active', true)->exists(),
                'registered_production' => DB::table('productions')->where('user_id', $user_id)->where('status', 'completed')->exists(),
                'dismissed'             => false,
                'created_at'            => $now,
                'updated_at'            => $now,
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_onboardings');
    }
};
