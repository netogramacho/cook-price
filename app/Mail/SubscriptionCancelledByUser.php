<?php

namespace App\Mail;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubscriptionCancelledByUser extends Mailable
{
    use Queueable, SerializesModels;

    public ?string $accessUntil;

    public function __construct(
        public User $user,
        ?Carbon $endsAt,
    ) {
        $this->accessUntil = $endsAt?->format('d/m/Y');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Sua assinatura foi cancelada — CookPrice',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.subscription-cancelled-by-user',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
