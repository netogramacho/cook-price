<?php

return [
    'access_token'   => env('MP_ACCESS_TOKEN', ''),
    'webhook_secret' => env('MP_WEBHOOK_SECRET', ''),
    'basic_plan_id'  => env('MP_BASIC_PLAN_ID', ''),
    'pro_plan_id'    => env('MP_PRO_PLAN_ID', ''),
    'back_url'       => env('MP_BACK_URL', env('APP_FRONTEND_URL', 'http://localhost')),
];
