<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ingredients', function (Blueprint $table) {
            $table->decimal('stock_quantity', 10, 3)->default(0)->after('last_price');
            $table->decimal('min_stock', 10, 3)->nullable()->after('stock_quantity');
        });
    }

    public function down(): void
    {
        Schema::table('ingredients', function (Blueprint $table) {
            $table->dropColumn(['stock_quantity', 'min_stock']);
        });
    }
};
