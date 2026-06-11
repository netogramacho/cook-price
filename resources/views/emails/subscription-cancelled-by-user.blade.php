<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assinatura cancelada - CookPrice</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 24px; }
    .card { background: #fff; border-radius: 12px; max-width: 520px; margin: 0 auto; padding: 40px 36px; }
    .logo { font-size: 28px; font-weight: 700; color: #111; margin: 0 0 8px; }
    .divider { border: none; border-top: 1px solid #e4e4e7; margin: 24px 0; }
    p { color: #444; line-height: 1.6; margin: 0 0 16px; }
    .highlight { background: #fef9f0; border-left: 4px solid #e07b39; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
    .footer { color: #888; font-size: 13px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <p class="logo">🍳 CookPrice</p>
    <hr class="divider">
    <p>Olá, {{ $user->name }}.</p>
    <p>Sua assinatura foi cancelada conforme solicitado.</p>
    @if ($accessUntil)
      <div class="highlight">
        Você ainda tem acesso a todos os recursos do seu plano até <strong>{{ $accessUntil }}</strong>. Após essa data, sua conta será revertida para o plano Gratuito.
      </div>
    @else
      <p>Sua conta foi revertida para o plano Gratuito.</p>
    @endif
    <p>Se mudar de ideia, você pode reativar sua assinatura a qualquer momento pelo app.</p>
    <hr class="divider">
    <p class="footer">CookPrice — Precificação inteligente para sua confeitaria.</p>
  </div>
</body>
</html>
