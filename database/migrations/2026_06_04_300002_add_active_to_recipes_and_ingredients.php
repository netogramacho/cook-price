<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recipes', function (Blueprint $table) {
            $table->boolean('active')->default(true)->after('id');
        });

        Schema::table('ingredients', function (Blueprint $table) {
            $table->boolean('active')->default(true)->after('id');
        });

        // Aplicar limites do plano Gratuito para todos os usuários existentes
        // Manter ativas apenas as 3 receitas mais antigas por usuário
        // Aplicar limites do plano Gratuito (max 3 receitas, max 15 ingredientes)
        $freeLimit = DB::table('plans')
            ->where('id', '6f262479-2c69-46be-9eb6-4b86a7e8c237')
            ->first();

        $recipeLimit     = $freeLimit->max_recipes ?? 3;
        $ingredientLimit = $freeLimit->max_ingredients ?? 15;

        $userIds = DB::table('users')->pluck('id');

        foreach ($userIds as $userId) {
            $keepRecipeIds = DB::table('recipes')
                ->where('user_id', $userId)
                ->orderBy('created_at', 'asc')
                ->limit($recipeLimit)
                ->pluck('id');

            if ($keepRecipeIds->isNotEmpty()) {
                DB::table('recipes')
                    ->where('user_id', $userId)
                    ->whereNotIn('id', $keepRecipeIds)
                    ->update(['active' => false]);
            }

            // Manter ativas apenas as 15 ingredientes mais antigos por usuário
            $keepIngredientIds = DB::table('ingredients')
                ->where('user_id', $userId)
                ->orderBy('created_at', 'asc')
                ->limit($ingredientLimit)
                ->pluck('id');

            if ($keepIngredientIds->isNotEmpty()) {
                DB::table('ingredients')
                    ->where('user_id', $userId)
                    ->whereNotIn('id', $keepIngredientIds)
                    ->update(['active' => false]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('recipes', function (Blueprint $table) {
            $table->dropColumn('active');
        });

        Schema::table('ingredients', function (Blueprint $table) {
            $table->dropColumn('active');
        });
    }
};
