<?php

namespace App\Observers;

use App\Models\Product;
use App\Models\UserOnboarding;

class ProductObserver
{
    public function created(Product $product): void
    {
        UserOnboarding::markFor($product->user_id, 'created_product');
    }
}
