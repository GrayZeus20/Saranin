<?php

namespace App\Http\Controllers;

use App\Services\TmdbService;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __construct(protected TmdbService $tmdb) {}

    public function index(Request $request)
    {
        $query = $request->input('q');
        $results = null;

        if ($query) {
            $results = $this->tmdb->searchMulti($query);
        }

        return view('search.results', compact('query', 'results'));
    }
}
