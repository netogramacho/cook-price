<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasUuids;

    protected $fillable = [
        'name', 'label', 'price',
        'max_recipes', 'max_ingredients',
        'has_pricing', 'has_production',
    ];

    protected $casts = [
        'price'          => 'decimal:2',
        'has_pricing'    => 'boolean',
        'has_production' => 'boolean',
    ];

    public static function free(): self
    {
        return static::where('name', 'free')->firstOrFail();
    }

    public static function allNames(): array
    {
        return static::pluck('name')->toArray();
    }

    public static function paidNames(): array
    {
        return static::where('name', '!=', 'free')->pluck('name')->toArray();
    }
}
