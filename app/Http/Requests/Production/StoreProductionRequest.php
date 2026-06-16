<?php

namespace App\Http\Requests\Production;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'recipe_id' => ['required', 'uuid', 'exists:recipes,id'],
            'notes'     => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'recipe_id.required' => 'A receita é obrigatória.',
            'recipe_id.exists'   => 'Receita não encontrada.',
        ];
    }
}
