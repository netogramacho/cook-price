<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_insumos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->index()->constrained()->onDelete('cascade');
            // Insumo é um ingredient (type: insumo) — embalagem/finalização consumida ao montar o produto
            $table->foreignUuid('ingredient_id')->index()->constrained()->onDelete('cascade');
            $table->decimal('quantity', 10, 4);
            $table->string('unit', 5)->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'ingredient_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_insumos');
    }
};
