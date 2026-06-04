<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha - CookPrice</title>
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
    <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
    <a href="{{ $resetUrl }}" class="btn">Redefinir minha senha</a>
    <p>Este link expira em <strong>60 minutos</strong>.</p>
    <p>Se você não solicitou a recuperação de senha, pode ignorar este e-mail com segurança. Sua senha permanecerá a mesma.</p>
    <hr class="divider">
    <p class="footer">
      Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
      <span class="url-text">{{ $resetUrl }}</span>
    </p>
  </div>
</body>
</html>
