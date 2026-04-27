<?php

namespace App\Http\Requests\Recipe;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRecipeRequest extends FormRequest
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
                'sometimes',
                'string',
                'max:150',
                Rule::unique('recipes')
                    ->where('user_id', $user_id)
                    ->ignore($this->route('recipe')),
            ],
            'description'                   => ['sometimes', 'nullable', 'string'],
            'yield'                         => ['sometimes', 'numeric', 'min:0.01'],
            'yield_unit'                    => ['sometimes', 'string', 'max:20'],
            'ingredients'                   => ['sometimes', 'array', 'min:1'],
            'ingredients.*.ingredient_id'   => [
                'required_with:ingredients',
                'uuid',
                Rule::exists('ingredients', 'id')->where('user_id', $user_id),
            ],
            'ingredients.*.quantity'        => ['required_with:ingredients', 'numeric', 'min:0.001'],
            'invisible_cost_pct'            => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'profit_multiplier'             => ['sometimes', 'numeric', 'min:1', 'max:10'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.max'                             => 'O nome deve ter no máximo 150 caracteres.',
            'name.unique'                          => 'Você já possui uma receita com esse nome.',
            'yield.min'                            => 'A quantidade produzida deve ser maior que zero.',
            'ingredients.min'                      => 'A receita deve ter ao menos um ingrediente.',
            'ingredients.*.ingredient_id.exists'   => 'Ingrediente não encontrado.',
            'ingredients.*.quantity.min'           => 'A quantidade deve ser maior que zero.',
            'invisible_cost_pct.max'               => 'O percentual não pode ser maior que 100.',
            'profit_multiplier.min'                => 'O multiplicador deve ser no mínimo 1.',
            'profit_multiplier.max'                => 'O multiplicador não pode ser maior que 10.',
        ];
    }
}
