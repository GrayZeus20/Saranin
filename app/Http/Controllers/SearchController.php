<?php

namespace App\Http\Controllers;

use App\Services\TmdbService;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __construct(protected TmdbService $tmdb) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $query = trim((string) ($validated['q'] ?? ''));
        $results = null;

        if ($query !== '') {
            $results = $this->tmdb->searchMulti($query);

            // search/multi also returns person and tv items, but every detail
            // page in this app is movie-only.
            $results['results'] = array_values(array_filter(
                $results['results'] ?? [],
                fn (array $item) => ($item['media_type'] ?? 'movie') === 'movie'
            ));
        }

        return view('search.results', compact('query', 'results'));
    }
}
