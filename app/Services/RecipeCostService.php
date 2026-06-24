<?php

namespace App\Services;

use App\Models\Recipe;
use App\Support\Unit;

class RecipeCostService
{
    public function calculate(Recipe $recipe): array
    {
        $ingredients = $recipe->ingredients->map(function ($ingredient) {
            // Custo do pacote normalizado para a unidade base da família (ex.: 1 kg -> 1000 g)
            $package_base   = $ingredient->package_size * Unit::factor($ingredient->unit);
            $price_per_base = $package_base > 0
                ? $ingredient->last_price / $package_base
                : 0;

            // Quantidade da receita também normalizada para a base antes de multiplicar
            $line_unit      = $ingredient->pivot->unit ?? $ingredient->unit;
            $quantity_base  = $ingredient->pivot->quantity * Unit::factor($line_unit);
            $subtotal       = $price_per_base * $quantity_base;

            // Preço por unidade exibido na unidade digitada (display fiel)
            $price_per_unit = $price_per_base * Unit::factor($line_unit);

            return [
                'id'             => $ingredient->id,
                'name'           => $ingredient->name,
                'type'           => $ingredient->type->value,
                'unit'           => $line_unit,
                'package_size'   => $ingredient->package_size,
                'last_price'     => $ingredient->last_price,
                'price_per_unit' => round($price_per_unit, 6),
                'quantity'       => $ingredient->pivot->quantity,
                'subtotal'       => round($subtotal, 2),
            ];
        });

        $ingredients_cost = round($ingredients->where('type', 'ingredient')->sum('subtotal'), 2);
        $insumos_cost     = round($ingredients->where('type', 'insumo')->sum('subtotal'), 2);
        $base_cost        = round($ingredients_cost + $insumos_cost, 2);

        $invisible_cost   = round($base_cost * (float) $recipe->invisible_cost_pct / 100, 2);
        $production_cost  = round($base_cost + $invisible_cost, 2);

        $multiplier      = (float) $recipe->profit_multiplier;
        $suggested_price = $multiplier > 0
            ? round($production_cost * $multiplier, 2)
            : 0;

        // Margem derivada: quanto do preço de venda é lucro (exibição apenas)
        $profit_margin_pct = $multiplier > 0
            ? round((1 - 1 / $multiplier) * 100, 2)
            : 0;

        $cost_per_yield            = $recipe->yield > 0 ? round($production_cost / $recipe->yield, 4)  : 0;
        $suggested_price_per_yield = $recipe->yield > 0 ? round($suggested_price  / $recipe->yield, 4) : 0;

        return [
            'ingredients'               => $ingredients,
            'ingredients_cost'          => $ingredients_cost,
            'insumos_cost'              => $insumos_cost,
            'base_cost'                 => $base_cost,
            'invisible_cost'            => $invisible_cost,
            'invisible_cost_pct'        => (float) $recipe->invisible_cost_pct,
            'production_cost'           => $production_cost,
            'profit_multiplier'         => $multiplier,
            'profit_margin_pct'         => $profit_margin_pct,
            'suggested_price'           => $suggested_price,
            'cost_per_yield'            => $cost_per_yield,
            'suggested_price_per_yield' => $suggested_price_per_yield,
        ];
    }
}
