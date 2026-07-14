<?php

namespace App\Services;

use App\Models\Product;
use App\Support\Unit;

/**
 * Calcula o custo de um Produto (camada vendável): receitas-componente + insumos.
 *
 * É a 3ª aplicação do mesmo padrão do RecipeCostService:
 *   Σ (custo_por_rendimento da receita × porção) + Σ subtotal de insumos
 *   → base → +custo invisível% → custo de produção → ×multiplicador → preço sugerido.
 *
 * O custo de cada receita-componente é puxado do RecipeCostService (cost_per_yield),
 * garantindo uma única fonte de verdade para o custo de preparo.
 */
class ProductCostService
{
    public function __construct(private RecipeCostService $recipeCostService) {}

    public function calculate(Product $product): array
    {
        $recipes = $product->recipes->map(function ($recipe) {
            // A quantidade é medida em NÚMERO DE RECEITAS (ex.: 1 = receita inteira,
            // 0,5 = meia receita), então o custo unitário é o da receita inteira
            // (production_cost), não o custo por unidade de rendimento.
            $breakdown   = $this->recipeCostService->calculate($recipe);
            $recipe_cost = (float) $breakdown['production_cost'];
            $quantity    = (float) $recipe->pivot->quantity;
            $subtotal    = round($recipe_cost * $quantity, 2);

            return [
                'id'          => $recipe->id,
                'name'        => $recipe->name,
                'yield_unit'  => $recipe->yield_unit,
                'recipe_cost' => round($recipe_cost, 2),
                'quantity'    => $recipe->pivot->quantity,
                'subtotal'    => $subtotal,
            ];
        });

        // O pivot product_insumos guarda itens de montagem do produto: podem ser
        // insumos (embalagem/finalização) OU ingredientes avulsos (cereja, granulado).
        $items = $product->insumos->map(function ($item) {
            // Mesmo cálculo de uma linha de ingrediente (normalização por unidade base)
            $package_base   = $item->package_size * Unit::factor($item->unit);
            $price_per_base = $package_base > 0 ? $item->last_price / $package_base : 0;

            $line_unit     = $item->pivot->unit ?? $item->unit;
            $quantity_base = $item->pivot->quantity * Unit::factor($line_unit);
            $subtotal      = $price_per_base * $quantity_base;

            return [
                'id'             => $item->id,
                'name'           => $item->name,
                'type'           => $item->type->value,
                'unit'           => $line_unit,
                'package_size'   => $item->package_size,
                'last_price'     => $item->last_price,
                'quantity'       => $item->pivot->quantity,
                'subtotal'       => round($subtotal, 2),
            ];
        });

        $ingredients = $items->where('type', 'ingredient')->values();
        $insumos     = $items->where('type', 'insumo')->values();

        $recipes_cost     = round($recipes->sum('subtotal'), 2);
        $ingredients_cost = round($ingredients->sum('subtotal'), 2);
        $insumos_cost     = round($insumos->sum('subtotal'), 2);
        $base_cost        = round($recipes_cost + $ingredients_cost + $insumos_cost, 2);

        $invisible_cost  = round($base_cost * (float) $product->invisible_cost_pct / 100, 2);
        $production_cost = round($base_cost + $invisible_cost, 2);

        $multiplier      = (float) $product->profit_multiplier;
        $suggested_price = $multiplier > 0 ? round($production_cost * $multiplier, 2) : 0;

        $profit_margin_pct = $multiplier > 0 ? round((1 - 1 / $multiplier) * 100, 2) : 0;

        $cost_per_yield            = $product->yield > 0 ? round($production_cost / $product->yield, 4)  : 0;
        $suggested_price_per_yield = $product->yield > 0 ? round($suggested_price  / $product->yield, 4) : 0;

        return [
            'recipes'                   => $recipes,
            'ingredients'               => $ingredients,
            'insumos'                   => $insumos,
            'recipes_cost'              => $recipes_cost,
            'ingredients_cost'          => $ingredients_cost,
            'insumos_cost'              => $insumos_cost,
            'base_cost'                 => $base_cost,
            'invisible_cost'            => $invisible_cost,
            'invisible_cost_pct'        => (float) $product->invisible_cost_pct,
            'production_cost'           => $production_cost,
            'profit_multiplier'         => $multiplier,
            'profit_margin_pct'         => $profit_margin_pct,
            'suggested_price'           => $suggested_price,
            'cost_per_yield'            => $cost_per_yield,
            'suggested_price_per_yield' => $suggested_price_per_yield,
        ];
    }
}
