<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 50)->unique();
            $table->string('label', 100);
            $table->decimal('price', 8, 2);
            $table->integer('max_recipes')->nullable();
            $table->integer('max_ingredients')->nullable();
            $table->boolean('has_pricing');
            $table->boolean('has_stock');
            $table->boolean('has_stock_history');
            $table->boolean('has_production');
            $table->timestamps();
        });

        $now = now();

        DB::table('plans')->insert([
            [
                'id'                => '6f262479-2c69-46be-9eb6-4b86a7e8c237',
                'name'              => 'free',
                'label'             => 'Gratuito',
                'price'             => 0,
                'max_recipes'       => 3,
                'max_ingredients'   => 15,
                'has_pricing'       => false,
                'has_stock'         => false,
                'has_stock_history' => false,
                'has_production'    => false,
                'created_at'        => $now,
                'updated_at'        => $now,
            ],
            [
                'id'                => 'ed7adcd6-5731-45f5-9d26-9bf9991faece',
                'name'              => 'basic',
                'label'             => 'Básico',
                'price'             => 19,
                'max_recipes'       => 15,
                'max_ingredients'   => 60,
                'has_pricing'       => true,
                'has_stock'         => true,
                'has_stock_history' => false,
                'has_production'    => false,
                'created_at'        => $now,
                'updated_at'        => $now,
            ],
            [
                'id'                => '4adb7e12-5472-4c90-8263-d48c623a7266',
                'name'              => 'pro',
                'label'             => 'Pro',
                'price'             => 39,
                'max_recipes'       => null,
                'max_ingredients'   => null,
                'has_pricing'       => true,
                'has_stock'         => true,
                'has_stock_history' => true,
                'has_production'    => true,
                'created_at'        => $now,
                'updated_at'        => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
