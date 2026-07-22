<?php

namespace App\Http\Controllers;

use App\Models\ViewLog;
use App\Models\GenreStat;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApiController extends Controller
{
    public function logView(Request $request): JsonResponse
    {
        $request->validate([
            'tmdb_id' => 'required|integer',
            'title' => 'required|string',
            'type' => 'required|in:movie,tv',
            'genre_ids' => 'nullable|array',
            'genre_names' => 'nullable|array',
        ]);

        ViewLog::updateOrCreate(
            ['tmdb_id' => $request->tmdb_id, 'type' => $request->type],
            ['title' => $request->title, 'view_count' => \DB::raw('view_count + 1')]
        );

        if ($request->genre_ids && $request->genre_names) {
            foreach ($request->genre_ids as $index => $genreId) {
                $genreName = $request->genre_names[$index] ?? 'Unknown';
                GenreStat::updateOrCreate(
                    ['genre_id' => $genreId],
                    ['genre_name' => $genreName, 'view_count' => \DB::raw('view_count + 1')]
                );
            }
        }

        return response()->json(['success' => true]);
    }
}
