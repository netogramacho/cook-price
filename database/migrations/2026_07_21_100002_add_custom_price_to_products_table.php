<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Preço de venda por unidade de rendimento definido à mão.
     * Null mantém o preço calculado pelo multiplicador de lucro.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('custom_price', 10, 2)->nullable()->after('profit_multiplier');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('custom_price');
        });
    }
};
