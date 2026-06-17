<?php

namespace App\Http\Requests\Subscription;

use App\Models\Plan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'plan' => ['required', Rule::in(Plan::paidNames())],
        ];
    }

    public function messages(): array
    {
        return [
            'plan.required' => 'O plano é obrigatório.',
            'plan.in'       => 'Plano inválido.',
        ];
    }
}
