<?php

namespace App\Services;

use App\Models\Ingredient;
use App\Models\Purchase;
use App\Models\StockMovement;
use App\Models\User;
use Carbon\Carbon;

class StockMovementService
{
    public function purchase(Ingredient $ingredient, array $item, Purchase $purchase, User $user): StockMovement
    {
        $package_size  = (float) $item['package_size'];
        $num_packages  = (float) $item['num_packages'];
        $total_price   = (float) $item['total_price'];
        $price_per_pkg = $total_price / $num_packages;
        $quantity      = $package_size * $num_packages;
        $unit_price    = $price_per_pkg / $package_size;

        $current_qty = (float) $ingredient->stock_quantity;
        $cmm_atual   = $current_qty > 0
            ? (float) $ingredient->last_price / (float) $ingredient->package_size
            : $unit_price;

        $novo_cmm = ($current_qty * $cmm_atual + $quantity * $unit_price) / ($current_qty + $quantity);

        $movement = StockMovement::create([
            'ingredient_id' => $ingredient->id,
            'user_id'       => $user->id,
            'purchase_id'   => $purchase->id,
            'type'          => 'purchase',
            'quantity'      => $quantity,
            'unit_price'    => $unit_price,
            'price_paid'    => $price_per_pkg,
            'movement_date' => $purchase->purchased_at,
            'notes'         => $purchase->notes,
        ]);

        $ingredient->stock_quantity = $current_qty + $quantity;
        $ingredient->package_size   = $package_size;
        $ingredient->last_price     = $novo_cmm * $package_size;
        $ingredient->save();

        return $movement;
    }

    public function deduct(
        Ingredient $ingredient,
        float $quantity,
        string $type,
        User $user,
        ?string $recipe_id = null,
        ?string $notes = null,
        ?Carbon $movement_date = null
    ): StockMovement {
        $unit_price = (float) $ingredient->last_price / (float) $ingredient->package_size;

        $movement = StockMovement::create([
            'ingredient_id' => $ingredient->id,
            'user_id'       => $user->id,
            'recipe_id'     => $recipe_id,
            'type'          => $type,
            'quantity'      => -$quantity,
            'unit_price'    => $unit_price,
            'movement_date' => $movement_date,
            'notes'         => $notes,
        ]);

        $ingredient->stock_quantity = (float) $ingredient->stock_quantity - $quantity;
        $ingredient->save();

        return $movement;
    }

    public function adjust(
        Ingredient $ingredient,
        float $new_quantity,
        User $user,
        ?string $notes = null,
        ?Carbon $movement_date = null
    ): StockMovement {
        $current_qty = (float) $ingredient->stock_quantity;
        $diff        = $new_quantity - $current_qty;
        $unit_price  = (float) $ingredient->package_size > 0
            ? (float) $ingredient->last_price / (float) $ingredient->package_size
            : 0;

        $movement = StockMovement::create([
            'ingredient_id' => $ingredient->id,
            'user_id'       => $user->id,
            'type'          => 'adjustment',
            'quantity'      => $diff,
            'unit_price'    => $unit_price,
            'movement_date' => $movement_date,
            'notes'         => $notes,
        ]);

        $ingredient->stock_quantity = $new_quantity;
        $ingredient->save();

        return $movement;
    }
}
