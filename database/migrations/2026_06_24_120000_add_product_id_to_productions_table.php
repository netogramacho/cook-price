<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productions', function (Blueprint $table) {
            // Produções passam a registrar a fabricação de um Produto.
            // recipe_id é mantido (nullable) para preservar o histórico antigo.
            $table->foreignUuid('product_id')->nullable()->after('recipe_id')->nullOnDelete()->constrained();
        });
    }

    public function down(): void
    {
        Schema::table('productions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_id');
        });
    }
};
