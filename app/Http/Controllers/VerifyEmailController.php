<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    public function verify(Request $request, string $id, string $hash): RedirectResponse
    {
        $frontendUrl = config('app.frontend_url');

        if (!$request->hasValidSignature()) {
            return redirect($frontendUrl . '/verify-email?error=link_invalido');
        }

        $user = User::find($id);

        if (!$user || !hash_equals($hash, sha1($user->getEmailForVerification()))) {
            return redirect($frontendUrl . '/verify-email?error=link_invalido');
        }

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        return redirect($frontendUrl . '/login?verified=1');
    }

    public function resend(Request $request): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json([
                'success'    => false,
                'message'    => 'E-mail já verificado.',
                'error_code' => 'EMAIL_ALREADY_VERIFIED',
            ], 400);
        }

        $request->user()->sendEmailVerificationNotification();

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'E-mail de verificação reenviado com sucesso.',
        ]);
    }
}
