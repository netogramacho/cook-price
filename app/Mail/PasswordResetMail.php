<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $resetUrl;

    public function __construct(string $token, string $email)
    {
        $this->resetUrl = config('app.frontend_url') . '/reset-password?token=' . $token . '&email=' . urlencode($email);
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Recuperação de Senha - CookPrice');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.password-reset');
    }
}
