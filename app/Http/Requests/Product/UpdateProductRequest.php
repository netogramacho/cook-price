<?php

namespace App\Http\Requests\Product;

use App\Support\Unit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    use ValidatesInsumoUnits;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $user_id = $this->user()->id;
        $product = $this->route('product');

        return [
            'name'                     => [
                'required',
                'string',
                'max:150',
                Rule::unique('products')->where('user_id', $user_id)->ignore($product),
            ],
            'description'              => ['nullable', 'string'],
            'yield'                    => ['required', 'numeric', 'min:0.01'],
            'yield_unit'               => ['required', 'string', 'max:20'],
            'invisible_cost_pct'       => ['required', 'numeric', 'min:0', 'max:100'],
            'profit_multiplier'        => ['required', 'numeric', 'min:1', 'max:10'],

            'recipes'                  => ['sometimes', 'array', 'min:1'],
            'recipes.*.recipe_id'      => [
                'required',
                'uuid',
                Rule::exists('recipes', 'id')->where('user_id', $user_id),
            ],
            'recipes.*.quantity'       => ['required', 'numeric', 'min:0.001'],

            'insumos'                  => ['nullable', 'array'],
            'insumos.*.ingredient_id'  => [
                'required',
                'uuid',
                Rule::exists('ingredients', 'id')->where('user_id', $user_id),
            ],
            'insumos.*.quantity'       => ['required', 'numeric', 'min:0.001'],
            'insumos.*.unit'           => ['required', 'string', Rule::in(Unit::allowed())],

            'ingredients'                  => ['nullable', 'array'],
            'ingredients.*.ingredient_id'  => [
                'required',
                'uuid',
                Rule::exists('ingredients', 'id')->where('user_id', $user_id),
            ],
            'ingredients.*.quantity'       => ['required', 'numeric', 'min:0.001'],
            'ingredients.*.unit'           => ['required', 'string', Rule::in(Unit::allowed())],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'                    => 'O nome do produto é obrigatório.',
            'name.max'                         => 'O nome deve ter no máximo 150 caracteres.',
            'name.unique'                      => 'Você já possui um produto com esse nome.',
            'yield.required'                   => 'A quantidade produzida é obrigatória.',
            'yield.min'                        => 'A quantidade produzida deve ser maior que zero.',
            'yield_unit.required'              => 'A unidade de rendimento é obrigatória.',
            'invisible_cost_pct.required'      => 'O percentual de custos de finalização é obrigatório.',
            'invisible_cost_pct.max'           => 'O percentual não pode ser maior que 100.',
            'profit_multiplier.required'       => 'O multiplicador de lucro é obrigatório.',
            'profit_multiplier.min'            => 'O multiplicador deve ser no mínimo 1.',
            'profit_multiplier.max'            => 'O multiplicador não pode ser maior que 10.',
            'recipes.min'                      => 'O produto deve ter ao menos uma receita.',
            'recipes.*.recipe_id.required'     => 'A receita é obrigatória.',
            'recipes.*.recipe_id.exists'       => 'Receita não encontrada.',
            'recipes.*.quantity.required'      => 'A quantidade da receita é obrigatória.',
            'recipes.*.quantity.min'           => 'A quantidade deve ser maior que zero.',
            'insumos.*.ingredient_id.required' => 'O insumo é obrigatório.',
            'insumos.*.ingredient_id.exists'   => 'Insumo não encontrado.',
            'insumos.*.quantity.required'      => 'A quantidade do insumo é obrigatória.',
            'insumos.*.quantity.min'           => 'A quantidade deve ser maior que zero.',
            'insumos.*.unit.required'          => 'A unidade do insumo é obrigatória.',
            'insumos.*.unit.in'                => 'Unidade inválida.',
        ];
    }
}
