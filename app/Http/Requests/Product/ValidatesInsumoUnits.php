<?php

namespace App\Http\Requests\Product;

use App\Models\Ingredient;
use App\Support\Unit;
use Illuminate\Validation\Validator;

trait ValidatesInsumoUnits
{
    /**
     * Garante que a unidade de cada insumo pertença à mesma família da unidade
     * do ingrediente/insumo referenciado (ex.: não permitir 'ml' num item em 'un').
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            foreach (['insumos', 'ingredients'] as $key) {
                $items = $this->input($key);
                if (!is_array($items) || !$items) {
                    continue;
                }

                $ids   = collect($items)->pluck('ingredient_id')->filter()->unique()->all();
                $units = Ingredient::whereIn('id', $ids)->pluck('unit', 'id');

                foreach ($items as $index => $item) {
                    $item_unit = $units[$item['ingredient_id'] ?? ''] ?? null;
                    $line_unit = $item['unit'] ?? null;

                    if ($item_unit && $line_unit && !Unit::sameFamily($item_unit, $line_unit)) {
                        $validator->errors()->add(
                            "$key.$index.unit",
                            'A unidade deve ser compatível com a do item.'
                        );
                    }
                }
            }
        });
    }
}
