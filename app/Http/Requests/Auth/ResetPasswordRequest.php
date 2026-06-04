<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token'                 => ['required', 'string'],
            'email'                 => ['required', 'email'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'token.required'                 => 'O token de recuperação é obrigatório.',
            'email.required'                 => 'O e-mail é obrigatório.',
            'email.email'                    => 'Informe um e-mail válido.',
            'password.required'              => 'A senha é obrigatória.',
            'password.min'                   => 'A senha deve ter no mínimo 8 caracteres.',
            'password.confirmed'             => 'A confirmação de senha não confere.',
            'password_confirmation.required' => 'A confirmação de senha é obrigatória.',
        ];
    }
}
