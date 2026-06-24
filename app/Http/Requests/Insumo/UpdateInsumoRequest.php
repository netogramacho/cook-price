<?php

namespace App\Http\Requests\Insumo;

use App\Support\Unit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInsumoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $insumo = $this->route('insumo');

        return [
            'name'         => [
                'required',
                'string',
                'max:100',
                Rule::unique('ingredients')->where('user_id', $this->user()->id)->ignore($insumo),
            ],
            'unit'         => ['required', 'string', Rule::in(Unit::allowed())],
            'package_size' => ['required', 'numeric', 'min:0.001'],
            'last_price'   => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'         => 'O nome do insumo é obrigatório.',
            'name.max'              => 'O nome deve ter no máximo 100 caracteres.',
            'name.unique'           => 'Você já possui um item com esse nome.',
            'unit.required'         => 'A unidade de medida é obrigatória.',
            'unit.in'               => 'A unidade deve ser: g, kg, ml, L ou un.',
            'package_size.required' => 'O tamanho do pacote é obrigatório.',
            'package_size.min'      => 'O tamanho do pacote deve ser maior que zero.',
            'last_price.required'   => 'O preço é obrigatório.',
            'last_price.min'        => 'O preço não pode ser negativo.',
        ];
    }
}
