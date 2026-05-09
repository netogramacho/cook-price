<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    use HasUuids;

    protected $fillable = [
        'ingredient_id',
        'user_id',
        'purchase_id',
        'recipe_id',
        'type',
        'quantity',
        'unit_price',
        'price_paid',
        'movement_date',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity'      => 'decimal:3',
            'unit_price'    => 'decimal:6',
            'price_paid'    => 'decimal:2',
            'movement_date' => 'date',
        ];
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }
}
