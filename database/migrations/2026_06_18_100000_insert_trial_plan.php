<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const TRIAL_ID = '1b3e9c40-5d2a-4f7a-9c1e-2a6b8d4f0e11';

    public function up(): void
    {
        $now = now();

        DB::table('plans')->insert([
            'id'              => self::TRIAL_ID,
            'name'            => 'trial',
            'label'           => 'Experimentação',
            'price'           => 0,
            'max_recipes'     => 3,
            'max_ingredients' => 15,
            'has_pricing'     => true,
            'has_production'  => true,
            'created_at'      => $now,
            'updated_at'      => $now,
        ]);
    }

    public function down(): void
    {
        DB::table('plans')->where('id', self::TRIAL_ID)->delete();
    }
};
