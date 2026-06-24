<?php

namespace App\Observers;

use App\Models\Insumo;
use App\Models\UserOnboarding;

class InsumoObserver
{
    public function created(Insumo $insumo): void
    {
        UserOnboarding::markFor($insumo->user_id, 'created_insumo');
    }
}
