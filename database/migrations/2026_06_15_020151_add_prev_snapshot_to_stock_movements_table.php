<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->decimal('prev_stock_quantity', 10, 3)->nullable()->after('price_paid');
            $table->decimal('prev_last_price', 10, 2)->nullable()->after('prev_stock_quantity');
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropColumn(['prev_stock_quantity', 'prev_last_price']);
        });
    }
};
