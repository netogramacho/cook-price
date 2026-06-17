<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequiresPlanFeature
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        if (!$request->user()->load('plan')->plan->$feature) {
            return response()->json([
                'success'    => false,
                'message'    => 'Esta funcionalidade não está disponível no seu plano.',
                'error_code' => 'PLAN_FEATURE_LOCKED',
            ], 403);
        }

        return $next($request);
    }
}
