<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Product extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'origin_recipe_id',
        'name',
        'description',
        'yield',
        'yield_unit',
        'invisible_cost_pct',
        'profit_multiplier',
        'custom_price',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'yield'              => 'decimal:2',
            'invisible_cost_pct' => 'decimal:2',
            'profit_multiplier'  => 'decimal:2',
            'custom_price'       => 'decimal:2',
            'active'             => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Receitas (preparos) que compõem o produto, com a porção consumida no pivot.
     */
    public function recipes(): BelongsToMany
    {
        return $this->belongsToMany(Recipe::class, 'product_recipes')
            ->using(ProductRecipe::class)
            ->withPivot('id', 'quantity')
            ->withTimestamps();
    }

    /**
     * Insumos (embalagem/finalização) consumidos na montagem do produto.
     */
    public function insumos(): BelongsToMany
    {
        return $this->belongsToMany(Ingredient::class, 'product_insumos')
            ->using(ProductInsumo::class)
            ->withPivot('id', 'quantity', 'unit')
            ->withTimestamps();
    }

    /**
     * Canais em que o produto tem preço manual fixado. Canais sem linha aqui
     * usam o preço calculado a partir da taxa (ver ProductCostService).
     */
    public function salesChannels(): BelongsToMany
    {
        return $this->belongsToMany(SalesChannel::class, 'product_sales_channels')
            ->using(ProductSalesChannel::class)
            ->withPivot('id', 'custom_price')
            ->withTimestamps();
    }
}
