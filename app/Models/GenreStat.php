<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GenreStat extends Model
{
    protected $fillable = ['genre_id', 'genre_name', 'view_count'];

    public function scopeTop($query, int $limit = 10)
    {
        return $query->orderByDesc('view_count')->limit($limit);
    }
}
