<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->integer('max_products')->nullable()->after('max_recipes');
            $table->boolean('has_products')->default(false)->after('has_production');
        });

        // Produtos (camada vendável precificada) acompanham o gating de precificação.
        DB::table('plans')->update([
            'has_products' => DB::raw('has_pricing'),
            'max_products' => DB::raw('max_recipes'),
        ]);
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['max_products', 'has_products']);
        });
    }
};
