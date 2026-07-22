<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_channels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->index()->constrained()->onDelete('cascade');
            $table->string('name', 60);
            // Comissão cobrada pelo app (iFood, 99Food, Rappi...) sobre o preço de venda
            $table->decimal('fee_pct', 5, 2)->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_channels');
    }
};
