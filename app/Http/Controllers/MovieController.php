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
        $page = (int) $request->query('page', 1);
        $trending = $this->tmdb->trendingMovies('week', $page);
        return view('movie.trending', ['movies' => $trending]);
    }

    public function popular(Request $request)
    {
        $page = (int) $request->query('page', 1);
        $popular = $this->tmdb->popularMovies($page);
        return view('movie.popular', ['movies' => $popular]);
    }

    public function topRated(Request $request)
    {
        $page = (int) $request->query('page', 1);
        $topRated = $this->tmdb->topRatedMovies($page);
        return view('movie.top-rated', ['movies' => $topRated]);
    }
}
