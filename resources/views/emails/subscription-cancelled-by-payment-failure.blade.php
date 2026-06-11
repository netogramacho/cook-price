<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Problema com pagamento - CookPrice</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 24px; }
    .card { background: #fff; border-radius: 12px; max-width: 520px; margin: 0 auto; padding: 40px 36px; }
    .logo { font-size: 28px; font-weight: 700; color: #111; margin: 0 0 8px; }
    .divider { border: none; border-top: 1px solid #e4e4e7; margin: 24px 0; }
    p { color: #444; line-height: 1.6; margin: 0 0 16px; }
    .alert { background: #fff2f2; border-left: 4px solid #e05252; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
    .btn { display: inline-block; background: #e07b39; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0 24px; }
    .footer { color: #888; font-size: 13px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <p class="logo">🍳 CookPrice</p>
    <hr class="divider">
    <p>Olá, {{ $user->name }}.</p>
    <div class="alert">
      Não foi possível processar o pagamento da sua assinatura. Sua conta foi revertida para o plano <strong>Gratuito</strong>.
    </div>
    <p>Isso pode ter acontecido por saldo insuficiente, cartão expirado ou limite atingido.</p>
    <p>Para reativar seu plano, acesse o app e faça uma nova assinatura:</p>
    <a href="{{ env('APP_FRONTEND_URL', config('app.url')) }}" class="btn">Reativar assinatura</a>
    <hr class="divider">
    <p class="footer">CookPrice — Precificação inteligente para sua confeitaria.</p>
  </div>
</body>
</html>
