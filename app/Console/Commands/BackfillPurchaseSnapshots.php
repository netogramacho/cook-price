<?php

namespace App\Console\Commands;

use App\Models\Purchase;
use App\Models\StockMovement;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackfillPurchaseSnapshots extends Command
{
    protected $signature = 'purchases:delete {purchase_id : UUID da compra a excluir}';
    protected $description = 'Reverte matematicamente e exclui uma compra (uso local apenas — aborta se houver movimentos posteriores)';

    public function handle(): int
    {
        $purchase_id = $this->argument('purchase_id');

        $purchase = Purchase::with('movements.ingredient')->find($purchase_id);

        if (!$purchase) {
            $this->error("Compra {$purchase_id} não encontrada.");
            return 1;
        }

        $this->info("Compra encontrada: {$purchase->id} — {$purchase->movements->count()} movimentos.");

        // Verificar movimentos posteriores em qualquer ingrediente
        foreach ($purchase->movements as $movement) {
            $has_later = StockMovement::where('ingredient_id', $movement->ingredient_id)
                ->where('id', '!=', $movement->id)
                ->where('created_at', '>', $movement->created_at)
                ->exists();

            if ($has_later) {
                $this->error("Ingrediente '{$movement->ingredient->name}' tem movimentos posteriores a esta compra. Abortando.");
                $this->line("Use a interface web (Resetar e cancelar compra) para este caso.");
                return 1;
            }
        }

        if (!$this->confirm("Confirmar exclusão da compra {$purchase->id} ({$purchase->movements->count()} ingredientes)?")) {
            $this->info('Cancelado.');
            return 0;
        }

        DB::transaction(function () use ($purchase) {
            foreach ($purchase->movements as $movement) {
                $ingredient = $movement->ingredient;

                $q_after   = (float) $ingredient->stock_quantity;
                $q_added   = (float) $movement->quantity;
                $q_before  = $q_after - $q_added;
                $unit_price = (float) $movement->unit_price;
                $pkg_size   = (float) $ingredient->package_size;

                if ($q_before <= 0 || $pkg_size <= 0) {
                    $ingredient->stock_quantity = 0;
                    $ingredient->last_price     = 0;
                } else {
                    $cmm_after  = (float) $ingredient->last_price / $pkg_size;
                    $cmm_before = ($cmm_after * $q_after - $q_added * $unit_price) / $q_before;
                    $ingredient->stock_quantity = $q_before;
                    $ingredient->last_price     = max(0, $cmm_before) * $pkg_size;
                }

                $ingredient->save();
                $movement->delete();

                $this->line("  -> {$ingredient->name}: estoque {$q_after} → {$ingredient->stock_quantity}, last_price → {$ingredient->last_price}");
            }

            $purchase->forceDelete();
        });

        $this->info('Compra excluída com sucesso.');
        return 0;
    }
}
