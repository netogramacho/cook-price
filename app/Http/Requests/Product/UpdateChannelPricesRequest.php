<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateChannelPricesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sales_channels'                     => ['present', 'array'],
            'sales_channels.*.sales_channel_id'  => [
                'required',
                'uuid',
                Rule::exists('sales_channels', 'id')->where('user_id', $this->user()->id),
            ],
            // null volta a linha para o preço calculado pela taxa
            'sales_channels.*.custom_price'      => ['nullable', 'numeric', 'min:0.01'],
        ];
    }

    public function messages(): array
    {
        return [
            'sales_channels.present'                    => 'A lista de aplicativos é obrigatória.',
            'sales_channels.*.sales_channel_id.required' => 'O aplicativo é obrigatório.',
            'sales_channels.*.sales_channel_id.exists'  => 'Aplicativo não encontrado.',
            'sales_channels.*.custom_price.numeric'     => 'O preço deve ser um número válido.',
            'sales_channels.*.custom_price.min'         => 'O preço deve ser maior que zero.',
        ];
    }
}
