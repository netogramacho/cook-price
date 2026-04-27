<?php

namespace App\Http\Requests\Ingredient;

use App\Enums\IngredientType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIngredientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'       => [
                'required',
                'string',
                'max:100',
                Rule::unique('ingredients')->where('user_id', $this->user()->id),
            ],
            'type'         => ['required', Rule::enum(IngredientType::class)],
            'unit'         => ['required', 'string', Rule::in(['g', 'ml', 'un'])],
            'package_size' => ['required', 'numeric', 'min:0.001'],
            'last_price'   => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'       => 'O nome do ingrediente é obrigatório.',
            'name.max'            => 'O nome deve ter no máximo 100 caracteres.',
            'name.unique'         => 'Você já possui um ingrediente com esse nome.',
            'type.required'          => 'O tipo é obrigatório.',
            'type.enum'              => 'Tipo inválido.',
            'unit.required'          => 'A unidade de medida é obrigatória.',
            'unit.in'                => 'A unidade deve ser: g, ml ou un.',
            'package_size.required'  => 'O tamanho do pacote é obrigatório.',
            'package_size.numeric'   => 'O tamanho do pacote deve ser um número válido.',
            'package_size.min'       => 'O tamanho do pacote deve ser maior que zero.',
            'last_price.required'    => 'O preço do pacote é obrigatório.',
            'last_price.numeric'     => 'O preço deve ser um número válido.',
            'last_price.min'         => 'O preço não pode ser negativo.',
        ];
    }
}
