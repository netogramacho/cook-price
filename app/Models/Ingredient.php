<?php

namespace App\Models;

use App\Enums\IngredientType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
    ];

    protected function casts(): array
    {
        return [
            'type'         => IngredientType::class,
            'package_size' => 'decimal:4',
            'last_price'   => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
