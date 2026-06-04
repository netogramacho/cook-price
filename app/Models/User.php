<?php

namespace App\Models;

use App\Mail\EmailVerificationMail;
use Database\Factories\UserFactory;
use Illuminate\Auth\MustVerifyEmail;
use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements CanResetPasswordContract, MustVerifyEmailContract
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUuids, MustVerifyEmail, Notifiable, CanResetPassword;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'invisible_cost_pct',
        'profit_multiplier',
        'disable_stock_control',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'      => 'datetime',
            'password'               => 'hashed',
            'invisible_cost_pct'     => 'decimal:2',
            'profit_multiplier'      => 'decimal:2',
            'disable_stock_control'  => 'boolean',
        ];
    }

    public function sendEmailVerificationNotification(): void
    {
        $verifyUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $this->getKey(), 'hash' => sha1($this->getEmailForVerification())]
        );

        Mail::to($this->email)->send(new EmailVerificationMail($verifyUrl));
    }
}
