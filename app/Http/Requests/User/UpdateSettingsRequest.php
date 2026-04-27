<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'invisible_cost_pct' => ['required', 'numeric', 'min:0', 'max:100'],
            'profit_multiplier'  => ['required', 'numeric', 'min:1', 'max:10'],
        ];
    }

    public function messages(): array
    {
        return [
            'invisible_cost_pct.required' => 'O percentual de custos invisíveis é obrigatório.',
            'invisible_cost_pct.numeric'  => 'O percentual deve ser um número válido.',
            'invisible_cost_pct.min'      => 'O percentual não pode ser negativo.',
            'invisible_cost_pct.max'      => 'O percentual não pode ser maior que 100.',
            'profit_multiplier.required'  => 'O multiplicador de lucro é obrigatório.',
            'profit_multiplier.numeric'   => 'O multiplicador deve ser um número válido.',
            'profit_multiplier.min'       => 'O multiplicador deve ser no mínimo 1.',
            'profit_multiplier.max'       => 'O multiplicador não pode ser maior que 10.',
        ];
    }
}
