<?php

namespace App\Observers;

use App\Models\Ingredient;
use App\Models\Product;
use App\Models\Recipe;
use App\Models\User;

class UserObserver
{
    public function updated(User $user): void
    {
        if (!$user->wasChanged('plan_id')) {
            return;
        }

        $plan = $user->load('plan')->plan;

        $this->rebalanceActive(
            Recipe::class,
            $user->id,
            $plan->max_recipes
        );

        $this->rebalanceActive(
            Ingredient::class,
            $user->id,
            $plan->max_ingredients
        );

        $this->rebalanceActive(
            Product::class,
            $user->id,
            $plan->max_products
        );
    }

    private function rebalanceActive(string $model, string $userId, ?int $limit): void
    {
        if ($limit === null) {
            // Plano ilimitado — ativa todos
            $model::where('user_id', $userId)->update(['active' => true]);
            return;
        }

        $keepIds = $model::where('user_id', $userId)
            ->oldest()
            ->limit($limit)
            ->pluck('id');

        $model::where('user_id', $userId)
            ->whereIn('id', $keepIds)
            ->update(['active' => true]);

        $model::where('user_id', $userId)
            ->whereNotIn('id', $keepIds)
            ->update(['active' => false]);
    }
}
