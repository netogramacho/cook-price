<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $configured = config('app.admin_token');

        if (empty($configured) || $request->header('X-Admin-Token') !== $configured) {
            return response()->json([
                'success'    => false,
                'message'    => 'Não autorizado.',
                'error_code' => 'UNAUTHORIZED',
            ], 401);
        }

        return $next($request);
    }
}
