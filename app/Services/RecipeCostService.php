<?php

namespace App\Services;

use App\Models\Recipe;

class RecipeCostService
{
    public function calculate(Recipe $recipe): array
    {
        $ingredients = $recipe->ingredients->map(function ($ingredient) {
            $price_per_unit = $ingredient->last_price / $ingredient->package_size;
            $subtotal       = $price_per_unit * $ingredient->pivot->quantity;

            return [
                'id'             => $ingredient->id,
                'name'           => $ingredient->name,
                'type'           => $ingredient->type->value,
                'unit'           => $ingredient->unit,
                'package_size'   => $ingredient->package_size,
                'last_price'     => $ingredient->last_price,
                'price_per_unit' => round($price_per_unit, 6),
                'quantity'       => $ingredient->pivot->quantity,
                'subtotal'       => round($subtotal, 2),
            ];
        });

        $ingredients_cost = round($ingredients->where('type', 'ingredient')->sum('subtotal'), 2);
        $packaging_cost   = round($ingredients->where('type', 'packaging')->sum('subtotal'), 2);
        $base_cost        = round($ingredients_cost + $packaging_cost, 2);

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
            'packaging_cost'            => $packaging_cost,
            'base_cost'                 => $base_cost,
            'invisible_cost'            => $invisible_cost,
            'invisible_cost_pct'        => (float) $recipe->invisible_cost_pct,
            'production_cost'           => $production_cost,
            'profit_multiplier'         => $multiplier,
            'profit_margin_pct'         => $profit_margin_pct,
            'suggested_price'           => $suggested_price,
            'total_cost'                => $base_cost,
            'cost_per_yield'            => $cost_per_yield,
            'suggested_price_per_yield' => $suggested_price_per_yield,
        ];
    }
}
