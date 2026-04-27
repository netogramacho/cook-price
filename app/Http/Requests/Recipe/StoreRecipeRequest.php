<?php

namespace App\Http\Requests\Recipe;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRecipeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $user_id = $this->user()->id;

        return [
            'name'                          => [
                'required',
                'string',
                'max:150',
                Rule::unique('recipes')->where('user_id', $user_id),
            ],
            'description'                   => ['nullable', 'string'],
            'yield'                         => ['required', 'numeric', 'min:0.01'],
            'yield_unit'                    => ['required', 'string', 'max:20'],
            'ingredients'                   => ['required', 'array', 'min:1'],
            'ingredients.*.ingredient_id'   => [
                'required',
                'uuid',
                Rule::exists('ingredients', 'id')->where('user_id', $user_id),
            ],
            'ingredients.*.quantity'        => ['required', 'numeric', 'min:0.001'],
            'invisible_cost_pct'            => ['required', 'numeric', 'min:0', 'max:100'],
            'profit_multiplier'             => ['required', 'numeric', 'min:1', 'max:10'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'                        => 'O nome da receita é obrigatório.',
            'name.max'                             => 'O nome deve ter no máximo 150 caracteres.',
            'name.unique'                          => 'Você já possui uma receita com esse nome.',
            'yield.required'                       => 'A quantidade produzida é obrigatória.',
            'yield.min'                            => 'A quantidade produzida deve ser maior que zero.',
            'yield_unit.required'                  => 'A unidade de rendimento é obrigatória.',
            'ingredients.required'                 => 'A receita deve ter ao menos um ingrediente.',
            'ingredients.min'                      => 'A receita deve ter ao menos um ingrediente.',
            'ingredients.*.ingredient_id.required' => 'O ingrediente é obrigatório.',
            'ingredients.*.ingredient_id.exists'   => 'Ingrediente não encontrado.',
            'ingredients.*.quantity.required'      => 'A quantidade do ingrediente é obrigatória.',
            'ingredients.*.quantity.min'           => 'A quantidade deve ser maior que zero.',
            'invisible_cost_pct.required'          => 'O percentual de custos invisíveis é obrigatório.',
            'invisible_cost_pct.max'               => 'O percentual não pode ser maior que 100.',
            'profit_multiplier.required'           => 'O multiplicador de lucro é obrigatório.',
            'profit_multiplier.min'                => 'O multiplicador deve ser no mínimo 1.',
            'profit_multiplier.max'                => 'O multiplicador não pode ser maior que 10.',
        ];
    }
}
