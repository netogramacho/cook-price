<?php

namespace App\Http\Requests\Ingredient;

use App\Enums\IngredientType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateIngredientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'       => [
                'sometimes',
                'string',
                'max:100',
                Rule::unique('ingredients')
                    ->where('user_id', $this->user()->id)
                    ->ignore($this->route('ingredient')),
            ],
            'type'         => ['sometimes', Rule::enum(IngredientType::class)],
            'unit'         => ['sometimes', 'string', Rule::in(['g', 'ml', 'un'])],
            'package_size' => ['sometimes', 'numeric', 'min:0.001'],
            'last_price'   => ['sometimes', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.max'           => 'O nome deve ter no máximo 100 caracteres.',
            'name.unique'        => 'Você já possui um ingrediente com esse nome.',
            'unit.in'               => 'A unidade deve ser: g, ml ou un.',
            'package_size.numeric'  => 'O tamanho do pacote deve ser um número válido.',
            'package_size.min'      => 'O tamanho do pacote deve ser maior que zero.',
            'last_price.numeric'    => 'O preço deve ser um número válido.',
            'last_price.min'        => 'O preço não pode ser negativo.',
        ];
    }
}
