<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()?->hasVerifiedEmail()) {
            return response()->json([
                'success'    => false,
                'message'    => 'E-mail não verificado. Verifique sua caixa de entrada.',
                'error_code' => 'EMAIL_NOT_VERIFIED',
            ], 403);
        }

        return $next($request);
    }
}
