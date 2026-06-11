<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plano ativado - CookPrice</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 24px; }
    .card { background: #fff; border-radius: 12px; max-width: 520px; margin: 0 auto; padding: 40px 36px; }
    .logo { font-size: 28px; font-weight: 700; color: #111; margin: 0 0 8px; }
    .divider { border: none; border-top: 1px solid #e4e4e7; margin: 24px 0; }
    p { color: #444; line-height: 1.6; margin: 0 0 16px; }
    .plan-badge { display: inline-block; background: #e07b39; color: #fff; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 15px; margin: 4px 0 20px; }
    .footer { color: #888; font-size: 13px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <p class="logo">🍳 CookPrice</p>
    <hr class="divider">
    <p>Olá, {{ $user->name }}!</p>
    <p>Seu plano foi ativado com sucesso:</p>
    <span class="plan-badge">{{ $plan->label }}</span>
    <p>Você já tem acesso a todos os recursos do plano. Boas receitas!</p>
    <p>Se tiver alguma dúvida, é só responder este e-mail.</p>
    <hr class="divider">
    <p class="footer">CookPrice — Precificação inteligente para sua confeitaria.</p>
  </div>
</body>
</html>
