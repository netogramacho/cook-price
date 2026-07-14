<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !$request->user()->is_admin) {
            return response()->json([
                'success'    => false,
                'message'    => 'Acesso restrito a administradores.',
                'error_code' => 'ADMIN_ONLY',
            ], 403);
        }

        return $next($request);
    }
}
