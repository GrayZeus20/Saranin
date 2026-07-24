<?php

namespace App\Http\Controllers;

use App\Services\TmdbService;
use Illuminate\Http\Request;

class MovieController extends Controller
{
    public function __construct(protected TmdbService $tmdb) {}

    public function show(int $id)
    {
        $movie = $this->tmdb->movieDetail($id);

        if (isset($movie['error'])) {
            abort(404);
        }

        return view('movie.show', compact('movie'));
    }

    public function trending()
    {
        $trending = $this->tmdb->trendingMovies('week');
        return view('movie.trending', ['movies' => $trending]);
    }

    public function popular()
    {
        $popular = $this->tmdb->popularMovies();
        return view('movie.popular', ['movies' => $popular]);
    }

    public function topRated()
    {
        $topRated = $this->tmdb->topRatedMovies();
        return view('movie.top-rated', ['movies' => $topRated]);
    }
}
