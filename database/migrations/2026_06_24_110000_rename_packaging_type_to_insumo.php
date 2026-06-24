<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Amplia o enum temporariamente para conter o novo valor, migra os dados e fecha o enum.
        DB::statement("ALTER TABLE ingredients MODIFY COLUMN type ENUM('ingredient','packaging','insumo') NOT NULL DEFAULT 'ingredient'");
        DB::table('ingredients')->where('type', 'packaging')->update(['type' => 'insumo']);
        DB::statement("ALTER TABLE ingredients MODIFY COLUMN type ENUM('ingredient','insumo') NOT NULL DEFAULT 'ingredient'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE ingredients MODIFY COLUMN type ENUM('ingredient','packaging','insumo') NOT NULL DEFAULT 'ingredient'");
        DB::table('ingredients')->where('type', 'insumo')->update(['type' => 'packaging']);
        DB::statement("ALTER TABLE ingredients MODIFY COLUMN type ENUM('ingredient','packaging') NOT NULL DEFAULT 'ingredient'");
    }
};
