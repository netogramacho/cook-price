<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Production extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'recipe_id',
        'quantity_recipes',
        'total_yield',
        'total_cost',
        'unit_cost',
        'notes',
        'snapshot',
        'produced_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity_recipes' => 'decimal:2',
            'total_yield'      => 'decimal:3',
            'total_cost'       => 'decimal:2',
            'unit_cost'        => 'decimal:4',
            'snapshot'         => 'array',
            'produced_at'      => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }
}
