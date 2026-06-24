<?php

namespace App\Http\Requests\Recipe;

use App\Models\Ingredient;
use App\Support\Unit;
use Illuminate\Validation\Validator;

trait ValidatesIngredientUnits
{
    /**
     * Garante que a unidade de cada linha pertença à mesma família da unidade
     * do ingrediente referenciado (ex.: não permitir 'ml' num ingrediente em 'g').
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $ingredients = $this->input('ingredients');
            if (!is_array($ingredients) || !$ingredients) {
                return;
            }

            $ids = collect($ingredients)->pluck('ingredient_id')->filter()->unique()->all();
            $units = Ingredient::whereIn('id', $ids)->pluck('unit', 'id');

            foreach ($ingredients as $index => $item) {
                $ingredient_unit = $units[$item['ingredient_id'] ?? ''] ?? null;
                $line_unit       = $item['unit'] ?? null;

                if ($ingredient_unit && $line_unit && !Unit::sameFamily($ingredient_unit, $line_unit)) {
                    $validator->errors()->add(
                        "ingredients.$index.unit",
                        'A unidade deve ser compatível com a do ingrediente.'
                    );
                }
            }
        });
    }
}
