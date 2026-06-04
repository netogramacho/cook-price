<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu e-mail - CookPrice</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 24px; }
    .card { background: #fff; border-radius: 12px; max-width: 520px; margin: 0 auto; padding: 40px 36px; }
    .logo { font-size: 28px; font-weight: 700; color: #111; margin: 0 0 8px; }
    .divider { border: none; border-top: 1px solid #e4e4e7; margin: 24px 0; }
    p { color: #444; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: #e07b39; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0 24px; }
    .footer { color: #888; font-size: 13px; margin-top: 24px; }
    .url-text { word-break: break-all; color: #666; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <p class="logo">🍳 CookPrice</p>
    <hr class="divider">
    <p>Olá,</p>
    <p>Obrigado por criar sua conta! Para começar a usar o CookPrice, confirme seu e-mail clicando no botão abaixo:</p>
    <a href="{{ $verifyUrl }}" class="btn">Confirmar e-mail</a>
    <p>Este link expira em <strong>60 minutos</strong>.</p>
    <p>Se você não criou uma conta no CookPrice, pode ignorar este e-mail.</p>
    <hr class="divider">
    <p class="footer">
      Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
      <span class="url-text">{{ $verifyUrl }}</span>
    </p>
  </div>
</body>
</html>
