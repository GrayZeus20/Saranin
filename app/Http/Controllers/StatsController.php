<?php

namespace App\Http\Controllers;

use App\Services\TmdbService;

class StatsController extends Controller
{
    public function __construct(protected TmdbService $tmdb) {}

    public function index()
    {
        $popular = $this->tmdb->popularMovies();
        $trending = $this->tmdb->trendingMovies();
        $genres = $this->tmdb->genres();

        return view('stats.index', compact('popular', 'trending', 'genres'));
    }
}
