<?php

namespace App\Providers;

use App\Models\Ingredient;
use App\Models\Insumo;
use App\Models\Product;
use App\Models\Production;
use App\Models\Recipe;
use App\Models\User;
use App\Observers\IngredientObserver;
use App\Observers\InsumoObserver;
use App\Observers\ProductObserver;
use App\Observers\ProductionObserver;
use App\Observers\RecipeObserver;
use App\Observers\UserObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ini_set('serialize_precision', -1);
        User::observe(UserObserver::class);
        Ingredient::observe(IngredientObserver::class);
        Insumo::observe(InsumoObserver::class);
        Recipe::observe(RecipeObserver::class);
        Product::observe(ProductObserver::class);
        Production::observe(ProductionObserver::class);
    }
}
