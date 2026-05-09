<?php

namespace App\Http\Requests\Stock;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'purchased_at'              => ['nullable', 'date'],
            'notes'                     => ['nullable', 'string', 'max:255'],
            'items'                     => ['required', 'array', 'min:1'],
            'items.*.ingredient_id'     => ['required', 'uuid', 'exists:ingredients,id'],
            'items.*.package_size'      => ['required', 'numeric', 'min:0.001'],
            'items.*.num_packages'      => ['required', 'numeric', 'min:0.001'],
            'items.*.total_price'       => ['required', 'numeric', 'min:0.01'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required'                    => 'Adicione pelo menos um ingrediente.',
            'items.min'                         => 'Adicione pelo menos um ingrediente.',
            'items.*.ingredient_id.required'    => 'Selecione um ingrediente.',
            'items.*.ingredient_id.exists'      => 'Ingrediente não encontrado.',
            'items.*.package_size.required'     => 'Informe o tamanho do pacote.',
            'items.*.package_size.min'          => 'O tamanho do pacote deve ser maior que zero.',
            'items.*.num_packages.required'     => 'Informe o número de pacotes.',
            'items.*.num_packages.min'          => 'O número de pacotes deve ser maior que zero.',
            'items.*.total_price.required'      => 'Informe o total pago.',
            'items.*.total_price.min'           => 'O total pago deve ser maior que zero.',
        ];
    }
}
