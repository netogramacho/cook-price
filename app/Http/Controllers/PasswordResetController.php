<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;

class PasswordResetController extends Controller
{
    public function forgot(ForgotPasswordRequest $request)
    {
        $user = User::where('email', $request->email)->first();

        if ($user) {
            $token = Password::createToken($user);
            Mail::to($user->email)->send(new PasswordResetMail($token, $user->email));
        }

        return response()->json([
            'success' => true,
            'message' => 'Se este e-mail estiver cadastrado, você receberá as instruções de recuperação em breve.',
        ]);
    }

    public function reset(ResetPasswordRequest $request)
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Password::tokenExists($user, $request->token)) {
            return response()->json([
                'success'    => false,
                'message'    => 'Token de recuperação inválido ou expirado.',
                'error_code' => 'INVALID_RESET_TOKEN',
            ], 400);
        }

        $user->password = $request->password;
        $user->save();

        Password::deleteToken($user);

        return response()->json([
            'success' => true,
            'message' => 'Senha redefinida com sucesso.',
        ]);
    }
}
