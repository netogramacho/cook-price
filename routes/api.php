<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\IngredientController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1')->name('auth.register');
    Route::post('login',    [AuthController::class, 'login'])->middleware('throttle:5,1')->name('auth.login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout'])->name('auth.logout');
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('dashboard',     [DashboardController::class, 'index']);

    Route::get('user',          [UserController::class, 'show']);
    Route::put('user/password', [UserController::class, 'changePassword']);
    Route::put('user/settings', [UserController::class, 'updateSettings']);

    Route::apiResource('ingredients', IngredientController::class);
    Route::apiResource('recipes', RecipeController::class);

    Route::get('stock',                                    [StockController::class, 'index']);
    Route::post('purchases',                               [PurchaseController::class, 'store']);
    Route::patch('ingredients/{ingredient}/stock',         [StockMovementController::class, 'adjust']);
    Route::get('ingredients/{ingredient}/movements',       [StockMovementController::class, 'index']);
    Route::post('recipes/{recipe}/produce',                [RecipeController::class, 'produce']);
});
