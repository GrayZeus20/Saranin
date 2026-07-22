<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ViewLog extends Model
{
    protected $fillable = ['tmdb_id', 'title', 'type', 'view_count'];

    public function scopeTop($query, int $limit = 10)
    {
        return $query->orderByDesc('view_count')->limit($limit);
    }
}
