<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('ingredient_id');
            $table->uuid('user_id');
            $table->uuid('purchase_id')->nullable();
            $table->uuid('recipe_id')->nullable();
            $table->enum('type', ['purchase', 'production', 'adjustment']);
            $table->decimal('quantity', 10, 3);
            $table->decimal('unit_price', 10, 6);
            $table->decimal('price_paid', 10, 2)->nullable();
            $table->date('movement_date')->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->index('ingredient_id');
            $table->index('user_id');
            $table->index('purchase_id');
            $table->index('recipe_id');

            $table->foreign('ingredient_id', 'sm_ingredient_fk')->references('id')->on('ingredients')->cascadeOnDelete();
            $table->foreign('user_id',       'sm_user_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('purchase_id',   'sm_purchase_fk')->references('id')->on('purchases')->nullOnDelete();
            $table->foreign('recipe_id',     'sm_recipe_fk')->references('id')->on('recipes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
