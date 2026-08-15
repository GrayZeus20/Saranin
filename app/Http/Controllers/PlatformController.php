<?php

namespace App\Http\Controllers;

use App\Services\TmdbService;
use Illuminate\Http\Request;

class PlatformController extends Controller
{
    private array $platforms = [
        8 => ['name' => 'Netflix', 'color' => 'bg-red-600'],
        119 => ['name' => 'Disney+', 'color' => 'bg-blue-600'],
        350 => ['name' => 'Apple TV+', 'color' => 'bg-slate-700'],
        384 => ['name' => 'HBO Max', 'color' => 'bg-purple-600'],
        10 => ['name' => 'Amazon Prime Video', 'color' => 'bg-sky-600'],
        2 => ['name' => 'Apple iTunes', 'color' => 'bg-pink-600'],
        3 => ['name' => 'Google Play Movies', 'color' => 'bg-emerald-600'],
    ];

    public function __construct(protected TmdbService $tmdb) {}

    public function index()
    {
        $platforms = $this->platforms;

        return view('platform.index', compact('platforms'));
    }

    public function show(int $providerId, Request $request)
    {
        $movies = $this->tmdb->discoverByPlatform($providerId, $this->page($request));
        $platform = $this->platforms[$providerId] ?? ['name' => 'Platform #'.$providerId, 'color' => 'bg-slate-700'];

        return view('platform.show', ['movies' => $movies, 'platform' => $platform, 'providerId' => $providerId]);
    }

    public function filter(Request $request)
    {
        $validated = $request->validate([
            'providers' => ['nullable', 'array', 'max:5'],
            'providers.*' => ['integer', 'in:'.implode(',', array_keys($this->platforms))],
        ]);

        $providers = array_map('intval', $validated['providers'] ?? []);
        $allResults = [];

        foreach ($providers as $providerId) {
            $data = $this->tmdb->discoverByPlatform($providerId);
            $platformName = $this->platforms[$providerId]['name'] ?? "Platform #$providerId";
            foreach (($data['results'] ?? []) as $movie) {
                $movie['_platform'] = $platformName;
                $allResults[] = $movie;
            }
        }

        usort($allResults, fn ($a, $b) => ($b['popularity'] ?? 0) <=> ($a['popularity'] ?? 0));

        $platformNames = array_map(fn (int $id) => $this->platforms[$id]['name'] ?? "Platform #$id", $providers);

        return view('platform.show', [
            'movies' => ['results' => $allResults],
            'platform' => ['name' => implode(' + ', $platformNames), 'color' => 'bg-slate-700'],
            'providerId' => null,
        ]);
    }
}
