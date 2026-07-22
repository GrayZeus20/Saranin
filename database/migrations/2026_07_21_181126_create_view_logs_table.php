<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('view_logs', function (Blueprint $table) {
            $table->id();
            $table->integer('tmdb_id');
            $table->string('title');
            $table->string('type')->default('movie');
            $table->integer('view_count')->default(1);
            $table->timestamps();

            $table->index('tmdb_id');
            $table->index('view_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('view_logs');
    }
};
