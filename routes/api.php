<?php

use App\Http\Controllers\Admin\IntegrationLogController;
use App\Http\Controllers\Admin\MpSubscriptionController;
use App\Http\Controllers\Admin\SubscriptionController as AdminSubscriptionController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\IngredientController;
use App\Http\Controllers\InsumoController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductionController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\SalesChannelController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VerifyEmailController;
use App\Http\Controllers\WebhookController;
use App\Http\Middleware\EnsureEmailIsVerified;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('users',                             [AdminUserController::class, 'index']);
    Route::get('users/{user}',                      [AdminUserController::class, 'show']);
    Route::post('users/{user}/plan',                [AdminUserController::class, 'updatePlan']);
    Route::post('users/{user}/resend-verification', [AdminUserController::class, 'resendVerification']);
    Route::post('users/{user}/verify-email',        [AdminUserController::class, 'verifyEmail']);
    Route::post('users/{user}/send-password-reset', [AdminUserController::class, 'sendPasswordReset']);
    Route::post('users/{user}/impersonate',         [AdminUserController::class, 'impersonate']);

    Route::post('subscriptions/{subscription}/cancel', [AdminSubscriptionController::class, 'cancel']);
    Route::post('subscriptions/{subscription}/sync',   [AdminSubscriptionController::class, 'sync']);

    Route::get('mp/subscriptions',                     [MpSubscriptionController::class, 'index']);
    Route::post('mp/subscriptions/{preapproval}/cancel', [MpSubscriptionController::class, 'cancel']);

    Route::get('integration-logs', [IntegrationLogController::class, 'index']);
});

Route::get('plans', [PlanController::class, 'index']);

Route::post('webhooks/mercadopago', [WebhookController::class, 'handleMercadoPago']);

Route::prefix('auth')->group(function () {
    Route::post('register',        [AuthController::class, 'register'])->middleware('throttle:10,1')->name('auth.register');
    Route::post('login',           [AuthController::class, 'login'])->middleware('throttle:5,1')->name('auth.login');
    Route::post('forgot-password', [PasswordResetController::class, 'forgot'])->middleware('throttle:5,1')->name('auth.forgot-password');
    Route::post('reset-password',  [PasswordResetController::class, 'reset'])->middleware('throttle:5,1')->name('auth.reset-password');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout',       [AuthController::class, 'logout'])->name('auth.logout');
        Route::post('email/resend', [VerifyEmailController::class, 'resend'])->middleware('throttle:6,1')->name('auth.email.resend');
    });
});

Route::middleware(['auth:sanctum', EnsureEmailIsVerified::class])->group(function () {
    Route::get('dashboard',     [DashboardController::class, 'index']);

    Route::get('onboarding',          [OnboardingController::class, 'show']);
    Route::post('onboarding/dismiss', [OnboardingController::class, 'dismiss']);

    Route::get('user',          [UserController::class, 'show']);
    Route::put('user/password', [UserController::class, 'changePassword']);
    Route::put('user/settings', [UserController::class, 'updateSettings']);

    Route::apiResource('ingredients', IngredientController::class);
    Route::apiResource('insumos', InsumoController::class)->except('show');
    Route::post('recipes/{recipe}/duplicate', [RecipeController::class, 'duplicate']);
    Route::apiResource('recipes', RecipeController::class);

    Route::middleware('plan.feature:has_products')->group(function () {
        Route::post('recipes/{recipe}/to-product', [ProductController::class, 'fromRecipe']);
        Route::put('products/{product}/price',          [ProductController::class, 'updatePrice']);
        Route::put('products/{product}/channel-prices', [ProductController::class, 'updateChannelPrices']);
        Route::apiResource('products', ProductController::class);
        Route::apiResource('sales-channels', SalesChannelController::class)->except('show');
    });

    Route::middleware('plan.feature:has_production')->group(function () {
        Route::get('productions/summary',         [ProductionController::class, 'summary']);
        Route::get('productions',                 [ProductionController::class, 'index']);
        Route::post('productions',                [ProductionController::class, 'store']);
        Route::patch('productions/{production}/cancel', [ProductionController::class, 'cancel']);
    });

    Route::get('subscriptions/current/pending', [SubscriptionController::class, 'currentPending']);
    Route::get('subscriptions/current',         [SubscriptionController::class, 'current']);
    Route::post('subscriptions',                [SubscriptionController::class, 'store']);
    Route::delete('subscriptions',              [SubscriptionController::class, 'cancel']);
});
