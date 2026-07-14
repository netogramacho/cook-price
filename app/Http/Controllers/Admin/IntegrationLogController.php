<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\IntegrationLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IntegrationLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $per_page = min((int) $request->get('per_page', 20), 100);
        $status   = $request->get('status'); // 'success' | 'error' | null

        $logs = IntegrationLog::query()
            ->when($status === 'success', fn ($q) => $q->where('success', true))
            ->when($status === 'error', fn ($q) => $q->where('success', false))
            ->orderByDesc('created_at')
            ->paginate($per_page);

        return response()->json([
            'success' => true,
            'data'    => $logs,
            'message' => 'Logs de integração listados com sucesso.',
        ]);
    }
}
