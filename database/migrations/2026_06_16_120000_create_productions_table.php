<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('productions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('recipe_id')->nullable()->nullOnDelete()->constrained();
            $table->decimal('quantity_recipes', 10, 2);
            $table->decimal('total_yield', 10, 3);
            $table->decimal('total_cost', 10, 2);
            $table->decimal('unit_cost', 10, 4);
            $table->string('notes', 500)->nullable();
            $table->json('snapshot');
            $table->date('produced_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('productions');
    }
};
