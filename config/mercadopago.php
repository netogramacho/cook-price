<?php

return [
    'access_token'          => env('MP_ACCESS_TOKEN', ''),
    'webhook_secret'        => env('MP_WEBHOOK_SECRET', ''),
    'back_url'              => env('MP_BACK_URL', env('APP_FRONTEND_URL', 'http://localhost')),
    'verify_ssl'            => env('MP_VERIFY_SSL', true),
    'payer_email_override'  => env('MP_PAYER_EMAIL_OVERRIDE', ''),
];
