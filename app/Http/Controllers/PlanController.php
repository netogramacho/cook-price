<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use Illuminate\Http\JsonResponse;

class PlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::orderBy('price')->get();

        return response()->json([
            'success' => true,
            'data'    => $plans,
            'message' => 'Planos carregados.',
        ]);
    }
}
