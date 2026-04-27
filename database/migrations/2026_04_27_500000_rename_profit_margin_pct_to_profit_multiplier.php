<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('profit_margin_pct', 'profit_multiplier');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('profit_multiplier', 5, 2)->default(3.00)->change();
        });

        Schema::table('recipes', function (Blueprint $table) {
            $table->renameColumn('profit_margin_pct', 'profit_multiplier');
        });
        Schema::table('recipes', function (Blueprint $table) {
            $table->decimal('profit_multiplier', 5, 2)->default(3.00)->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('profit_multiplier', 'profit_margin_pct');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('profit_margin_pct', 5, 2)->default(0)->change();
        });

        Schema::table('recipes', function (Blueprint $table) {
            $table->renameColumn('profit_multiplier', 'profit_margin_pct');
        });
        Schema::table('recipes', function (Blueprint $table) {
            $table->decimal('profit_margin_pct', 5, 2)->default(0)->change();
        });
    }
};
