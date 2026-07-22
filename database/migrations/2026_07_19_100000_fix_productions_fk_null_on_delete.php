<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Corrige as foreign keys de productions para ON DELETE SET NULL.
     *
     * As migrations originais usavam ->nullOnDelete()->constrained() (ordem
     * invertida), então o nullOnDelete era ignorado e a FK caía em RESTRICT,
     * travando a exclusão de receitas/produtos que já tiveram produção.
     * A produção é um snapshot histórico e não deve bloquear essas exclusões.
     */
    public function up(): void
    {
        Schema::table('productions', function (Blueprint $table) {
            $table->dropForeign(['recipe_id']);
            $table->dropForeign(['product_id']);
            $table->foreign('recipe_id')->references('id')->on('recipes')->nullOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('productions', function (Blueprint $table) {
            $table->dropForeign(['recipe_id']);
            $table->dropForeign(['product_id']);
            $table->foreign('recipe_id')->references('id')->on('recipes');
            $table->foreign('product_id')->references('id')->on('products');
        });
    }
};
