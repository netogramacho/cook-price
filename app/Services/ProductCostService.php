<?php

namespace App\Services;

use App\Models\Product;
use App\Models\SalesChannel;
use App\Support\Unit;
use Illuminate\Support\Collection;

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

    /**
     * @param Collection<int, SalesChannel>|null $channels Canais do usuário já carregados
     *        (a listagem de produtos passa a coleção para não repetir a query por produto).
     */
    public function calculate(Product $product, ?Collection $channels = null): array
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

        $yield            = (float) $product->yield;
        $multiplier       = (float) $product->profit_multiplier;
        $calculated_price = $multiplier > 0 ? round($production_cost * $multiplier, 2) : 0;

        $cost_per_yield             = $yield > 0 ? round($production_cost  / $yield, 4) : 0;
        $calculated_price_per_yield = $yield > 0 ? round($calculated_price / $yield, 4) : 0;

        // Preço definido à mão (por unidade de rendimento) prevalece sobre o multiplicador;
        // nesse caso a margem passa a ser a real desse preço, não a do multiplicador cadastrado.
        $custom_price = $product->custom_price === null ? null : (float) $product->custom_price;

        $suggested_price_per_yield = $custom_price ?? $calculated_price_per_yield;
        $suggested_price           = $custom_price === null ? $calculated_price : round($custom_price * $yield, 2);

        $profit_margin_pct = $custom_price === null
            ? ($multiplier > 0 ? round((1 - 1 / $multiplier) * 100, 2) : 0)
            : ($suggested_price_per_yield > 0 ? round((1 - $cost_per_yield / $suggested_price_per_yield) * 100, 2) : 0);

        return [
            'recipes'                    => $recipes,
            'ingredients'                => $ingredients,
            'insumos'                    => $insumos,
            'sales_channels'             => $this->salesChannels($product, $channels, $suggested_price_per_yield, $cost_per_yield),
            'recipes_cost'               => $recipes_cost,
            'ingredients_cost'           => $ingredients_cost,
            'insumos_cost'               => $insumos_cost,
            'base_cost'                  => $base_cost,
            'invisible_cost'             => $invisible_cost,
            'invisible_cost_pct'         => (float) $product->invisible_cost_pct,
            'production_cost'            => $production_cost,
            'profit_multiplier'          => $multiplier,
            'profit_margin_pct'          => $profit_margin_pct,
            'suggested_price'            => $suggested_price,
            'cost_per_yield'             => $cost_per_yield,
            'suggested_price_per_yield'  => $suggested_price_per_yield,
            'custom_price'               => $custom_price,
            'calculated_price_per_yield' => $calculated_price_per_yield,
        ];
    }

    /**
     * Preço do produto em cada app de delivery (iFood, 99Food...).
     *
     * O preço é calculado por gross-up — sugerido ÷ (1 − taxa) — para que, depois
     * de o app reter a comissão, o líquido seja exatamente o preço sugerido.
     * Se a pessoa fixou um preço manual (arredondamento comercial), ele prevalece
     * e o líquido/margem são recalculados em cima dele.
     */
    private function salesChannels(Product $product, ?Collection $channels, float $suggested_price_per_yield, float $cost_per_yield): Collection
    {
        $custom_prices = $product->salesChannels->mapWithKeys(
            fn ($channel) => [$channel->id => $channel->pivot->custom_price]
        );

        $channels ??= self::channelsOf($product->user_id);

        return $channels->map(function (SalesChannel $channel) use ($custom_prices, $suggested_price_per_yield, $cost_per_yield) {
            $fee_pct = (float) $channel->fee_pct;
            $keep    = 1 - $fee_pct / 100;

            $calculated_price = $keep > 0 ? round($suggested_price_per_yield / $keep, 2) : 0;

            $custom_price = $custom_prices->get($channel->id);
            $custom_price = $custom_price === null ? null : (float) $custom_price;

            $price      = $custom_price ?? $calculated_price;
            $fee_amount = round($price * $fee_pct / 100, 2);
            $net_price  = round($price - $fee_amount, 2);

            return [
                'id'               => $channel->id,
                'name'             => $channel->name,
                'fee_pct'          => $fee_pct,
                'calculated_price' => $calculated_price,
                'custom_price'     => $custom_price,
                'price'            => round($price, 2),
                'fee_amount'       => $fee_amount,
                'net_price'        => $net_price,
                'margin_pct'       => $net_price > 0 ? round((1 - $cost_per_yield / $net_price) * 100, 2) : 0,
            ];
        });
    }

    /** @return Collection<int, SalesChannel> */
    public static function channelsOf(string $user_id): Collection
    {
        return SalesChannel::where('user_id', $user_id)
            ->where('active', true)
            ->orderBy('name')
            ->get();
    }
}
