<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MercadoPagoService
{
    private string $accessToken;
    private string $webhookSecret;
    private string $backUrl;

    public function __construct()
    {
        $this->accessToken   = config('mercadopago.access_token');
        $this->webhookSecret = config('mercadopago.webhook_secret');
        $this->backUrl       = config('mercadopago.back_url');
    }

    public function createPreapproval(User $user, Plan $plan): array
    {
        $mpPlanId = $plan->name === 'basic'
            ? config('mercadopago.basic_plan_id')
            : config('mercadopago.pro_plan_id');

        $response = Http::withToken($this->accessToken)
            ->post('https://api.mercadopago.com/preapproval', [
                'preapproval_plan_id' => $mpPlanId,
                'reason'              => "{$plan->label} - CookPrice",
                'payer_email'         => $user->email,
                'back_url'            => $this->backUrl,
            ]);

        if ($response->failed()) {
            Log::error('MercadoPago createPreapproval falhou', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException('Erro ao criar assinatura no MercadoPago.');
        }

        return $response->json();
    }

    public function getPreapproval(string $preapprovalId): array
    {
        $response = Http::withToken($this->accessToken)
            ->get("https://api.mercadopago.com/preapproval/{$preapprovalId}");

        if ($response->failed()) {
            Log::error('MercadoPago getPreapproval falhou', [
                'preapproval_id' => $preapprovalId,
                'status'         => $response->status(),
            ]);
            throw new \RuntimeException('Erro ao consultar assinatura no MercadoPago.');
        }

        return $response->json();
    }

    public function cancelPreapproval(string $preapprovalId): void
    {
        $response = Http::withToken($this->accessToken)
            ->patch("https://api.mercadopago.com/preapproval/{$preapprovalId}", [
                'status' => 'cancelled',
            ]);

        if ($response->failed()) {
            Log::error('MercadoPago cancelPreapproval falhou', [
                'preapproval_id' => $preapprovalId,
                'status'         => $response->status(),
            ]);
            throw new \RuntimeException('Erro ao cancelar assinatura no MercadoPago.');
        }
    }

    public function validateWebhookSignature(Request $request): bool
    {
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

        $dataId  = $request->input('data.id', '');
        $message = "id:{$dataId};request-id:{$requestId};ts:{$parts['ts']}";
        $hash    = hash_hmac('sha256', $message, $this->webhookSecret);

        return hash_equals($hash, $parts['v1']);
    }
}
