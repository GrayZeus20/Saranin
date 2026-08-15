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

    public function trending(Request $request)
    {
        $trending = $this->tmdb->trendingMovies('week', $this->page($request));

        return view('movie.trending', ['movies' => $trending]);
    }

    public function popular(Request $request)
    {
        $popular = $this->tmdb->popularMovies($this->page($request));

        return view('movie.popular', ['movies' => $popular]);
    }

    public function topRated(Request $request)
    {
        $topRated = $this->tmdb->topRatedMovies($this->page($request));

        return view('movie.top-rated', ['movies' => $topRated]);
    }
}
