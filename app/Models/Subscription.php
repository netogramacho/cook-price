<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'plan_id',
        'mp_preapproval_id',
        'mp_status',
        'checkout_url',
        'starts_at',
        'ends_at',
        'cancel_at_period_end',
    ];

    protected $casts = [
        'starts_at'            => 'datetime',
        'ends_at'              => 'datetime',
        'cancel_at_period_end' => 'boolean',
    ];

    // Oculta identificadores internos/sensiveis da serializacao (ex.: /subscriptions/current).
    // Resultado bate com o contrato TS SubscriptionData (id, mp_status, datas, flag, plan).
    protected $hidden = [
        'mp_preapproval_id',
        'checkout_url',
        'user_id',
        'plan_id',
        'created_at',
        'updated_at',
    ];

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
