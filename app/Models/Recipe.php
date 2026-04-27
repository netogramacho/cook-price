<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Recipe extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'yield',
        'yield_unit',
        'invisible_cost_pct',
        'profit_multiplier',
    ];

    protected function casts(): array
    {
        return [
            'yield'              => 'decimal:2',
            'invisible_cost_pct' => 'decimal:2',
            'profit_multiplier'  => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ingredients(): BelongsToMany
    {
        return $this->belongsToMany(Ingredient::class, 'recipe_ingredients')
            ->using(RecipeIngredient::class)
            ->withPivot('id', 'quantity')
            ->withTimestamps();
    }
}
