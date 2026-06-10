<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('service', 50);
            $table->enum('direction', ['outgoing', 'incoming']);
            $table->string('type', 100);
            $table->json('payload')->nullable();
            $table->json('response')->nullable();
            $table->smallInteger('status_code')->nullable();
            $table->boolean('success');
            $table->text('error_message')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['service', 'created_at']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_logs');
    }
};
