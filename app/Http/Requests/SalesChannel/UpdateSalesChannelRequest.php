<?php

namespace App\Http\Requests\SalesChannel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSalesChannelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'    => [
                'required',
                'string',
                'max:60',
                Rule::unique('sales_channels')
                    ->where('user_id', $this->user()->id)
                    ->ignore($this->route('sales_channel')),
            ],
            'fee_pct' => ['required', 'numeric', 'min:0', 'max:95'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'    => 'O nome do aplicativo é obrigatório.',
            'name.max'         => 'O nome deve ter no máximo 60 caracteres.',
            'name.unique'      => 'Você já possui um aplicativo com esse nome.',
            'fee_pct.required' => 'A taxa do aplicativo é obrigatória.',
            'fee_pct.numeric'  => 'A taxa deve ser um número válido.',
            'fee_pct.min'      => 'A taxa não pode ser negativa.',
            'fee_pct.max'      => 'A taxa não pode ser maior que 95%.',
        ];
    }
}
