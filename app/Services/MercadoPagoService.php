<?php

namespace App\Services;

use App\Models\IntegrationLog;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class MercadoPagoService
{
    private string $accessToken;
    private string $webhookSecret;
    private string $backUrl;
    private bool $verifySsl;

    public function __construct()
    {
        $this->accessToken   = config('mercadopago.access_token');
        $this->webhookSecret = config('mercadopago.webhook_secret');
        $this->backUrl       = config('mercadopago.back_url');
        $this->verifySsl     = (bool) config('mercadopago.verify_ssl', true);

        // Detecta configuracao ausente no boot, em vez de falhar silenciosamente em producao.
        if (empty($this->webhookSecret) && app()->environment('production')) {
            throw new \RuntimeException('MP_WEBHOOK_SECRET nao configurado.');
        }
    }

    public function createPreapproval(User $user, Plan $plan): array
    {
        $backUrl = str_contains($this->backUrl, '?')
            ? $this->backUrl . '&subscription=pending'
            : $this->backUrl . '?subscription=pending';

        $payload = [
            'reason'         => "{$plan->label} - CookPrice",
            'payer_email'    => $user->email,
            'back_url'       => $backUrl,
            'status'         => 'pending',
            'auto_recurring' => [
                'frequency'          => 1,
                'frequency_type'     => 'months',
                'transaction_amount' => round((float) $plan->price, 2),
                'currency_id'        => 'BRL',
            ],
        ];

        $response = $this->http()->post('https://api.mercadopago.com/preapproval', $payload);

        $this->logOutgoing('create_preapproval', $payload, $response);

        if ($response->failed()) {
            throw new \RuntimeException('Erro ao criar assinatura no MercadoPago.');
        }

        return $response->json();
    }

    public function getPreapproval(string $preapprovalId): array
    {
        $payload  = ['preapproval_id' => $preapprovalId];
        $response = $this->http()->get("https://api.mercadopago.com/preapproval/{$preapprovalId}");

        $this->logOutgoing('get_preapproval', $payload, $response);

        if ($response->failed()) {
            throw new \RuntimeException('Erro ao consultar assinatura no MercadoPago.');
        }

        return $response->json();
    }

    public function getAuthorizedPayment(string $authorizedPaymentId): array
    {
        $payload  = ['authorized_payment_id' => $authorizedPaymentId];
        $response = $this->http()->get("https://api.mercadopago.com/preapproval/authorized_payment/{$authorizedPaymentId}");

        $this->logOutgoing('get_authorized_payment', $payload, $response);

        if ($response->failed()) {
            throw new \RuntimeException('Erro ao consultar pagamento autorizado no MercadoPago.');
        }

        return $response->json();
    }

    public function cancelPreapproval(string $preapprovalId): void
    {
        $payload  = ['preapproval_id' => $preapprovalId, 'status' => 'cancelled'];
        $response = $this->http()->put("https://api.mercadopago.com/preapproval/{$preapprovalId}", ['status' => 'cancelled']);

        $this->logOutgoing('cancel_preapproval', $payload, $response);

        if ($response->failed()) {
            throw new \RuntimeException('Erro ao cancelar assinatura no MercadoPago.');
        }
    }

    public function logIncomingWebhook(Request $request, bool $success, ?string $errorMessage = null): void
    {
        IntegrationLog::create([
            'service'           => 'mercadopago',
            'access_token_hint' => $this->tokenHint(),
            'direction'         => 'incoming',
            'type'              => 'webhook_' . ($request->input('type', 'unknown')),
            'payload'           => [
                'headers' => [
                    'x-signature'  => $request->header('x-signature'),
                    'x-request-id' => $request->header('x-request-id'),
                ],
                'body' => $request->all(),
            ],
            'response'      => null,
            'status_code'   => null,
            'success'       => $success,
            'error_message' => $errorMessage,
        ]);
    }

    public function validateWebhookSignature(Request $request): bool
    {
        // Sem secret configurado, nenhum webhook e confiavel (falha fechada).
        // hash_hmac com chave vazia geraria um HMAC valido e forjavel pelo atacante.
        if (empty($this->webhookSecret)) {
            return false;
        }

        $signatureHeader = $request->header('x-signature');
        $requestId       = $request->header('x-request-id', '');

        if (!$signatureHeader) {
            return false;
        }

        $parts = [];
        foreach (explode(',', $signatureHeader) as $part) {
            [$key, $value] = explode('=', $part, 2);
            $parts[trim($key)] = trim($value);
        }

        if (empty($parts['ts']) || empty($parts['v1'])) {
            return false;
        }

        $dataId  = strtolower($request->input('data.id', ''));
        $message = "id:{$dataId};request-id:{$requestId};ts:{$parts['ts']};";
        $hash    = hash_hmac('sha256', $message, $this->webhookSecret);

        return hash_equals($hash, $parts['v1']);
    }

    private function http(): \Illuminate\Http\Client\PendingRequest
    {
        $client = Http::withToken($this->accessToken);
        if (!$this->verifySsl) {
            $client = $client->withoutVerifying();
        }
        return $client;
    }

    private function tokenHint(): string
    {
        $token = $this->accessToken;
        return strlen($token) > 8 ? substr($token, 0, 16) . '****' : '****';
    }

    private function logOutgoing(string $type, array $payload, Response $response): void
    {
        $success = $response->successful();

        IntegrationLog::create([
            'service'            => 'mercadopago',
            'access_token_hint'  => $this->tokenHint(),
            'direction'          => 'outgoing',
            'type'               => $type,
            'payload'            => $payload,
            'response'           => $response->json() ?? ['raw' => $response->body()],
            'status_code'        => $response->status(),
            'success'            => $success,
            'error_message'      => $success ? null : ($response->json('message') ?? $response->body()),
        ]);
    }
}
