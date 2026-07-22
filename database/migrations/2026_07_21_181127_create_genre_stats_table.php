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
        Schema::create('genre_stats', function (Blueprint $table) {
            $table->id();
            $table->integer('genre_id');
            $table->string('genre_name');
            $table->integer('view_count')->default(1);
            $table->timestamps();

            $table->index('genre_id');
            $table->index('view_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('genre_stats');
    }
};
