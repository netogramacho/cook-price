<?php

namespace App\Observers;

use App\Models\Ingredient;
use App\Models\UserOnboarding;

class IngredientObserver
{
    public function created(Ingredient $ingredient): void
    {
        UserOnboarding::markFor($ingredient->user_id, 'created_ingredient');
    }
}
