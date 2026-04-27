<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recipes', function (Blueprint $table) {
            $table->decimal('invisible_cost_pct', 5, 2)->default(0)->after('yield_unit');
            $table->decimal('profit_margin_pct',  5, 2)->default(0)->after('invisible_cost_pct');
        });
    }

    public function down(): void
    {
        Schema::table('recipes', function (Blueprint $table) {
            $table->dropColumn(['invisible_cost_pct', 'profit_margin_pct']);
        });
    }
};
