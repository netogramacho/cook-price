<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('integration_logs', function (Blueprint $table) {
            $table->string('access_token_hint', 20)->nullable()->after('service');
        });
    }

    public function down(): void
    {
        Schema::table('integration_logs', function (Blueprint $table) {
            $table->dropColumn('access_token_hint');
        });
    }
};
