<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Receita de origem quando o produto foi gerado via "Transformar em produto".
            $table->foreignUuid('origin_recipe_id')->nullable()->after('user_id')->constrained('recipes')->nullOnDelete();
        });

        // Backfill: produtos com exatamente 1 receita-componente (ex.: os gerados na
        // migração receitas->produtos) recebem essa receita como origem.
        DB::statement('UPDATE products p SET origin_recipe_id = ('
            . 'SELECT pr.recipe_id FROM product_recipes pr WHERE pr.product_id = p.id LIMIT 1'
            . ') WHERE (SELECT COUNT(*) FROM product_recipes pr2 WHERE pr2.product_id = p.id) = 1');
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropConstrainedForeignId('origin_recipe_id');
        });
    }
};
