<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'                  => ['required', 'string', 'max:255'],
            'email'                 => ['required', 'email', 'unique:users,email'],
            'phone'                 => ['required', 'string', 'max:20', 'unique:users,phone'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'                  => 'O nome é obrigatório.',
            'name.max'                       => 'O nome não pode ter mais de 255 caracteres.',
            'email.required'                 => 'O e-mail é obrigatório.',
            'email.email'                    => 'Informe um e-mail válido.',
            'email.unique'                   => 'Este e-mail já está em uso.',
            'phone.required'                 => 'O telefone é obrigatório.',
            'phone.max'                      => 'O telefone não pode ter mais de 20 caracteres.',
            'phone.unique'                   => 'Este telefone já está em uso.',
            'password.required'              => 'A senha é obrigatória.',
            'password.min'                   => 'A senha deve ter no mínimo 8 caracteres.',
            'password.confirmed'             => 'A confirmação de senha não confere.',
            'password_confirmation.required' => 'A confirmação de senha é obrigatória.',
        ];
    }
}
