<?php

namespace App\Http\Controllers;

use App\Services\TmdbService;

class HomeController extends Controller
{
    public function __construct(protected TmdbService $tmdb) {}

    public function index()
    {
        $popular = $this->tmdb->popularMovies();
        $trending = $this->tmdb->trendingMovies('week');
        $nowPlaying = $this->tmdb->nowPlayingMovies();
        $upcoming = $this->tmdb->upcomingMovies();
        $topRated = $this->tmdb->topRatedMovies();
        $genres = $this->tmdb->genres();
        $platforms = $this->tmdb->platformProviders();

        return view('home', compact('popular', 'trending', 'nowPlaying', 'upcoming', 'topRated', 'genres', 'platforms'));
    }
}
