<?php

namespace App\Models;

use App\Enums\IngredientType;
use Illuminate\Database\Eloquent\Builder;

/**
 * Insumo é o mesmo registro de Ingredient (mesma tabela `ingredients`),
 * porém restrito ao type "insumo" — embalagem/finalização consumida ao montar produtos.
 *
 * Single Table Inheritance: o global scope mantém as consultas de Insumo isoladas,
 * enquanto Ingredient permanece sem escopo para uso em relações.
 */
class Insumo extends Ingredient
{
    protected $table = 'ingredients';

    protected static function booted(): void
    {
        static::addGlobalScope('insumo', function (Builder $builder) {
            $builder->where('type', IngredientType::Insumo->value);
        });

        static::creating(function (Insumo $insumo) {
            $insumo->type = IngredientType::Insumo;
        });
    }
}
