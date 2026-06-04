<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $verifyUrl) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Confirme seu e-mail - CookPrice');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.email-verification');
    }
}
