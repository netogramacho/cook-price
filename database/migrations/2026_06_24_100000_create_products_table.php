<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->index()->constrained()->onDelete('cascade');
            $table->string('name', 150)->index();
            $table->text('description')->nullable();
            $table->decimal('yield', 8, 2)->default(1);
            $table->string('yield_unit', 20)->default('un');
            // Custo de finalização do produto (montagem/embalagem) — separado do custo invisível do preparo
            $table->decimal('invisible_cost_pct', 5, 2)->default(0);
            // Precificação migrou da receita para o produto
            $table->decimal('profit_multiplier', 5, 2)->default(3.00);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
