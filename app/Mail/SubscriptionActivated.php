<?php

namespace App\Mail;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubscriptionActivated extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public Plan $plan,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Seu plano ' . $this->plan->label . ' foi ativado — CookPrice',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.subscription-activated',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
