<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Canal de venda (iFood, 99Food, Rappi...) com a comissão cobrada pelo app.
 * É cadastrado uma única vez por usuário e vale para todos os produtos.
 */
class SalesChannel extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'name',
        'fee_pct',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'fee_pct' => 'decimal:2',
            'active'  => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
