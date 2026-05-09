<?php

namespace App\Http\Requests\Stock;

use Illuminate\Foundation\Http\FormRequest;

class AdjustStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'stock_quantity' => ['required', 'numeric', 'min:0'],
            'movement_date'  => ['nullable', 'date'],
            'notes'          => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'stock_quantity.required' => 'Informe a quantidade em estoque.',
            'stock_quantity.min'      => 'A quantidade não pode ser negativa.',
        ];
    }
}
