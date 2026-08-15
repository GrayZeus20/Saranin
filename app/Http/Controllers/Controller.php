<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * TMDB rejects pages outside 1..500.
     */
    protected function page(Request $request): int
    {
        return max(1, min(500, (int) $request->query('page', 1)));
    }
}
