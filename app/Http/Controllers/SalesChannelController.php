<?php

namespace App\Http\Controllers;

use App\Http\Requests\SalesChannel\StoreSalesChannelRequest;
use App\Http\Requests\SalesChannel\UpdateSalesChannelRequest;
use App\Models\SalesChannel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesChannelController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $channels = SalesChannel::where('user_id', $request->user()->id)
            ->where('active', true)
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $channels,
            'message' => 'Aplicativos listados com sucesso.',
        ]);
    }

    public function store(StoreSalesChannelRequest $request): JsonResponse
    {
        $channel = SalesChannel::create([
            'user_id' => $request->user()->id,
            'name'    => $request->name,
            'fee_pct' => $request->fee_pct,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $channel,
            'message' => 'Aplicativo criado com sucesso.',
        ], 201);
    }

    public function update(UpdateSalesChannelRequest $request, SalesChannel $sales_channel): JsonResponse
    {
        if ($denied = $this->authorizeChannel($request, $sales_channel)) return $denied;

        $sales_channel->update($request->only('name', 'fee_pct'));

        return response()->json([
            'success' => true,
            'data'    => $sales_channel,
            'message' => 'Aplicativo atualizado com sucesso.',
        ]);
    }

    public function destroy(Request $request, SalesChannel $sales_channel): JsonResponse
    {
        if ($denied = $this->authorizeChannel($request, $sales_channel)) return $denied;

        // Inativa em vez de excluir: preserva os preços manuais já definidos nos produtos
        $sales_channel->update(['active' => false]);

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Aplicativo removido com sucesso.',
        ]);
    }

    private function authorizeChannel(Request $request, SalesChannel $channel): ?JsonResponse
    {
        if ($channel->user_id !== $request->user()->id || !$channel->active) {
            return response()->json([
                'success'    => false,
                'message'    => 'Aplicativo não encontrado.',
                'error_code' => 'SALES_CHANNEL_NOT_FOUND',
            ], 404);
        }
        return null;
    }
}
