<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // null devolve o produto ao preço calculado pelo multiplicador
            'custom_price' => ['present', 'nullable', 'numeric', 'min:0.01', 'max:99999999.99'],
        ];
    }

    public function messages(): array
    {
        return [
            'custom_price.present' => 'O preço é obrigatório.',
            'custom_price.numeric' => 'O preço deve ser um número válido.',
            'custom_price.min'     => 'O preço deve ser maior que zero.',
            'custom_price.max'     => 'O preço informado é muito alto.',
        ];
    }
}
