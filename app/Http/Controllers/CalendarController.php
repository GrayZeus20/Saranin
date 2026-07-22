<?php

namespace App\Http\Controllers;

use App\Services\TmdbService;

class CalendarController extends Controller
{
    public function __construct(protected TmdbService $tmdb) {}

    public function index()
    {
        $upcoming = $this->tmdb->upcomingMovies();
        $nowPlaying = $this->tmdb->nowPlayingMovies();

        return view('calendar.index', compact('upcoming', 'nowPlaying'));
    }
}
