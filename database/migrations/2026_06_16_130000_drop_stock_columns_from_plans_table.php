<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['has_stock', 'has_stock_history']);
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->boolean('has_stock')->default(false)->after('has_pricing');
            $table->boolean('has_stock_history')->default(false)->after('has_stock');
        });
    }
};
