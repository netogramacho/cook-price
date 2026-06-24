<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserOnboarding extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'created_ingredient',
        'created_insumo',
        'created_recipe',
        'created_product',
        'registered_production',
        'dismissed',
    ];

    protected function casts(): array
    {
        return [
            'created_ingredient'    => 'boolean',
            'created_insumo'        => 'boolean',
            'created_recipe'        => 'boolean',
            'created_product'       => 'boolean',
            'registered_production' => 'boolean',
            'dismissed'             => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Marca um passo do onboarding como concluído para o usuário.
     * Idempotente: cria a linha se ainda não existir e só atualiza quando necessário.
     */
    public static function markFor(string $user_id, string $step): void
    {
        $onboarding = static::firstOrCreate(['user_id' => $user_id]);

        if (!$onboarding->$step) {
            $onboarding->update([$step => true]);
        }
    }
}
