<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SearchLog extends Model
{
    protected $fillable = ['query', 'count'];

    public function scopeTop($query, int $limit = 10)
    {
        return $query->orderByDesc('count')->limit($limit);
    }
}
