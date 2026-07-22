<?php

return [
    'access_token'   => env('MP_ACCESS_TOKEN', ''),
    'webhook_secret' => env('MP_WEBHOOK_SECRET', ''),
    'back_url'       => env('MP_BACK_URL', env('APP_FRONTEND_URL', 'http://localhost')),
    'verify_ssl'     => env('MP_VERIFY_SSL', true),

    // Tetos de tempo (segundos) para as chamadas HTTP ao MercadoPago. Evita que uma
    // resposta lenta pendure o worker — crítico porque o webhook é processado síncrono.
    'timeout'         => env('MP_HTTP_TIMEOUT', 15),
    'connect_timeout' => env('MP_HTTP_CONNECT_TIMEOUT', 5),
];
