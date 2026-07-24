<?php

namespace App\Http\Controllers;

class StatsController extends Controller
{
    public function index()
    {
        return view('stats.index', [
            'topSearches' => collect(),
            'topViews' => collect(),
            'topGenres' => collect(),
            'totalSearches' => 0,
            'totalViews' => 0,
            'totalGenres' => 0,
            'recentSearches' => collect(),
            'recentViews' => collect()
        ]);
    }
}
