<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'current_password'],
            'password'         => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required'  => 'A senha atual é obrigatória.',
            'current_password.current_password' => 'A senha atual está incorreta.',
            'password.required'          => 'A nova senha é obrigatória.',
            'password.min'               => 'A nova senha deve ter no mínimo 8 caracteres.',
            'password.confirmed'         => 'A confirmação da nova senha não confere.',
        ];
    }
}
