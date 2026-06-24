<?php

use App\Models\Product;
use App\Models\Recipe;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Migração de dados: cada receita existente vira um Produto vendável, preservando
 * a precificação (profit_multiplier) e movendo as linhas de insumo (ex-embalagem)
 * da receita para o produto. As receitas ficam, então, "puras" (só ingredientes).
 *
 * Depende de: products/product_recipes/product_insumos criados (100000-100002)
 * e do enum já renomeado packaging -> insumo (110000).
 */
return new class extends Migration
{
    public function up(): void
    {
        Recipe::with('ingredients')->chunkById(100, function ($recipes) {
            foreach ($recipes as $recipe) {
                DB::transaction(function () use ($recipe) {
                    $product = Product::create([
                        'user_id'            => $recipe->user_id,
                        'name'               => $this->uniqueProductName($recipe->user_id, $recipe->name),
                        'description'        => $recipe->description,
                        'yield'              => $recipe->yield,
                        'yield_unit'         => $recipe->yield_unit,
                        'invisible_cost_pct' => 0, // o custo invisível continua na receita
                        'profit_multiplier'  => $recipe->profit_multiplier ?? 3.0,
                    ]);

                    $product->recipes()->sync([$recipe->id => ['quantity' => 1]]);

                    $insumoSync = [];
                    $insumoIds  = [];
                    foreach ($recipe->ingredients as $ingredient) {
                        if ($ingredient->type->value === 'insumo') {
                            $insumoSync[$ingredient->id] = [
                                'quantity' => $ingredient->pivot->quantity,
                                'unit'     => $ingredient->pivot->unit,
                            ];
                            $insumoIds[] = $ingredient->id;
                        }
                    }

                    if ($insumoSync) {
                        $product->insumos()->sync($insumoSync);
                        // Remove os insumos da receita — agora pertencem ao produto
                        $recipe->ingredients()->detach($insumoIds);
                    }
                });
            }
        });
    }

    public function down(): void
    {
        // Remove apenas os produtos gerados automaticamente (1 receita + 0 insumos próprios extras).
        // A reversão não restaura as linhas de insumo nas receitas (use o backup se necessário).
        DB::table('products')->delete();
    }

    private function uniqueProductName(string $user_id, string $base): string
    {
        $name = $base;
        $i    = 2;
        while (DB::table('products')->where('user_id', $user_id)->where('name', $name)->exists()) {
            $name = $base . ' (' . $i . ')';
            $i++;
        }
        return $name;
    }
};
