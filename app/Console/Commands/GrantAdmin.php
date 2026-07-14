<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('admin:grant {email} {--revoke : Remove o acesso de administrador}')]
#[Description('Concede (ou revoga com --revoke) acesso de administrador a um usuário pelo e-mail')]
class GrantAdmin extends Command
{
    public function handle(): int
    {
        $email  = $this->argument('email');
        $revoke = $this->option('revoke');

        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("Usuário não encontrado: {$email}");
            return self::FAILURE;
        }

        $user->is_admin = !$revoke;
        $user->save();

        $this->info($revoke
            ? "Acesso de administrador revogado de {$email}."
            : "Acesso de administrador concedido a {$email}.");

        return self::SUCCESS;
    }
}
