<?php

namespace App\Http\Controllers;

use App\Models\SearchLog;
use App\Services\TmdbService;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __construct(protected TmdbService $tmdb) {}

    public function index(Request $request)
    {
        $query = $request->input('q');
        $results = null;
        $topSearches = SearchLog::top(10)->get();

        if ($query) {
            SearchLog::updateOrCreate(
                ['query' => strtolower($query)],
                ['count' => \DB::raw('count + 1')]
            );

            $results = $this->tmdb->searchMulti($query);
        }

        return view('search.results', compact('query', 'results', 'topSearches'));
    }
}
