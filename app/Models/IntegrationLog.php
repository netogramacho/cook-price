<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class IntegrationLog extends Model
{
    use HasUuids;

    const UPDATED_AT = null;

    protected $fillable = [
        'service',
        'direction',
        'type',
        'payload',
        'response',
        'status_code',
        'success',
        'error_message',
    ];

    protected $casts = [
        'payload'  => 'array',
        'response' => 'array',
        'success'  => 'boolean',
    ];
}
