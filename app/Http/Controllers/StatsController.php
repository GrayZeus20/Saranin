<?php

namespace App\Http\Controllers;

use App\Models\SearchLog;
use App\Models\ViewLog;
use App\Models\GenreStat;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    public function index()
    {
        $topSearches = SearchLog::top(10)->get();
        $topViews = ViewLog::top(10)->get();
        $topGenres = GenreStat::top(10)->get();

        $totalSearches = SearchLog::sum('count');
        $totalViews = ViewLog::sum('view_count');
        $totalGenres = GenreStat::count();

        $recentSearches = SearchLog::orderByDesc('updated_at')->limit(20)->get();
        $recentViews = ViewLog::orderByDesc('updated_at')->limit(20)->get();

        return view('stats.index', compact(
            'topSearches', 'topViews', 'topGenres',
            'totalSearches', 'totalViews', 'totalGenres',
            'recentSearches', 'recentViews'
        ));
    }
}
