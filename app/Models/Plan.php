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
        'has_pricing', 'has_stock', 'has_stock_history', 'has_production',
    ];

    protected $casts = [
        'price'             => 'decimal:2',
        'has_pricing'       => 'boolean',
        'has_stock'         => 'boolean',
        'has_stock_history' => 'boolean',
        'has_production'    => 'boolean',
    ];
}
