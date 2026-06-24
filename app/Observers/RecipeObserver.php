<?php

namespace App\Observers;

use App\Models\Recipe;
use App\Models\UserOnboarding;

class RecipeObserver
{
    public function created(Recipe $recipe): void
    {
        UserOnboarding::markFor($recipe->user_id, 'created_recipe');
    }
}
