<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\IngredientController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\ProductionController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VerifyEmailController;
use App\Http\Controllers\WebhookController;
use App\Http\Middleware\EnsureEmailIsVerified;
use Illuminate\Support\Facades\Route;

Route::post('admin/users/{userId}/plan', [AdminController::class, 'updateUserPlan']);

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

    Route::get('user',          [UserController::class, 'show']);
    Route::put('user/password', [UserController::class, 'changePassword']);
    Route::put('user/settings', [UserController::class, 'updateSettings']);

    Route::apiResource('ingredients', IngredientController::class);
    Route::post('recipes/{recipe}/duplicate', [RecipeController::class, 'duplicate']);
    Route::apiResource('recipes', RecipeController::class);

    Route::get('productions/summary',          [ProductionController::class, 'summary']);
    Route::get('productions',                  [ProductionController::class, 'index']);
    Route::post('productions',                 [ProductionController::class, 'store']);
    Route::delete('productions/{production}',  [ProductionController::class, 'destroy']);

    Route::get('subscriptions/current', [SubscriptionController::class, 'current']);
    Route::post('subscriptions',        [SubscriptionController::class, 'store']);
    Route::delete('subscriptions',      [SubscriptionController::class, 'cancel']);
});
