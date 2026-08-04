<?php

namespace App\Http\Controllers;

use App\Services\TmdbService;
use Illuminate\Http\Request;

class GenreController extends Controller
{
    public function __construct(protected TmdbService $tmdb) {}

    public function index()
    {
        $genres = $this->tmdb->genres();
        return view('genre.index', compact('genres'));
    }

    public function show(int $id, Request $request)
    {
        $page = (int) $request->query('page', 1);
        $movies = $this->tmdb->discoverByGenre($id, $page);
        $genres = $this->tmdb->genres();
        $genreName = '';
        foreach (($genres['genres'] ?? []) as $g) {
            if ($g['id'] == $id) {
                $genreName = $g['name'];
                break;
            }
        }

        return view('genre.show', ['movies' => $movies, 'genreName' => $genreName, 'genres' => $genres]);
    }
}
