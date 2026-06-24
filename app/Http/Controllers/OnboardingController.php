<?php

namespace App\Http\Controllers;

use App\Models\UserOnboarding;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    private const FIELDS = [
        'created_ingredient',
        'created_insumo',
        'created_recipe',
        'created_product',
        'registered_production',
        'dismissed',
    ];

    public function show(Request $request): JsonResponse
    {
        $onboarding = UserOnboarding::firstOrCreate(['user_id' => $request->user()->id]);

        return response()->json([
            'success' => true,
            'data'    => $onboarding->only(self::FIELDS),
            'message' => 'Onboarding carregado com sucesso.',
        ]);
    }

    public function dismiss(Request $request): JsonResponse
    {
        $onboarding = UserOnboarding::firstOrCreate(['user_id' => $request->user()->id]);
        $onboarding->update(['dismissed' => true]);

        return response()->json([
            'success' => true,
            'data'    => $onboarding->only(self::FIELDS),
            'message' => 'Onboarding ocultado com sucesso.',
        ]);
    }
}
