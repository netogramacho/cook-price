<?php

namespace App\Observers;

use App\Models\Production;
use App\Models\UserOnboarding;

class ProductionObserver
{
    public function created(Production $production): void
    {
        UserOnboarding::markFor($production->user_id, 'registered_production');
    }
}
