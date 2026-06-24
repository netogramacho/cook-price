<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recipe_ingredients', function (Blueprint $table) {
            $table->string('unit', 5)->nullable()->after('quantity');
        });

        // Backfill: cada linha herda a unidade do seu ingrediente (que hoje já é a unidade base).
        foreach (DB::table('recipe_ingredients')->whereNull('unit')->get() as $row) {
            $unit = DB::table('ingredients')->where('id', $row->ingredient_id)->value('unit') ?? 'un';
            DB::table('recipe_ingredients')->where('id', $row->id)->update(['unit' => $unit]);
        }
    }

    public function down(): void
    {
        Schema::table('recipe_ingredients', function (Blueprint $table) {
            $table->dropColumn('unit');
        });
    }
};
