<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Preço manual do produto em um canal. Só existe linha quando a pessoa fixa
     * um preço (ex.: arredondar 27,40 para 27,90); sem linha, vale o preço calculado
     * a partir da taxa do canal.
     */
    public function up(): void
    {
        Schema::create('product_sales_channels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->index()->constrained()->onDelete('cascade');
            $table->foreignUuid('sales_channel_id')->index()->constrained()->onDelete('cascade');
            $table->decimal('custom_price', 10, 2)->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'sales_channel_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_sales_channels');
    }
};
