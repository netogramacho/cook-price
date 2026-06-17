<?php

namespace App\Models;

use App\Enums\IngredientType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ingredient extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'name',
        'type',
        'unit',
        'package_size',
        'last_price',
        'stock_quantity',
        'min_stock',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'type'           => IngredientType::class,
            'package_size'   => 'decimal:4',
            'last_price'     => 'decimal:2',
            'stock_quantity' => 'decimal:3',
            'min_stock'      => 'decimal:3',
            'active'         => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function recipes(): BelongsToMany
    {
        return $this->belongsToMany(Recipe::class, 'recipe_ingredients')
            ->using(RecipeIngredient::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}
