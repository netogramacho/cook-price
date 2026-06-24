<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_recipes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->index()->constrained()->onDelete('cascade');
            $table->foreignUuid('recipe_id')->index()->constrained()->onDelete('cascade');
            // Quantos rendimentos (yield) da receita o produto consome (ex.: 0.5 receita)
            $table->decimal('quantity', 10, 4);
            $table->timestamps();

            $table->unique(['product_id', 'recipe_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_recipes');
    }
};
