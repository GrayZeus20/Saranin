<?php

namespace App\Http\Controllers;

use App\Services\TmdbService;
use Illuminate\Http\Request;

class PlatformController extends Controller
{
    private array $platforms = [
        8 => ['name' => 'Netflix', 'icon' => 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Logotype_Netflix.svg'],
        119 => ['name' => 'Disney+', 'icon' => 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg'],
        350 => ['name' => 'Apple TV+', 'icon' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Apple_TV_Plus_logo.svg/200px-Apple_TV_Plus_logo.svg.png'],
        384 => ['name' => 'HBO Max', 'icon' => 'https://upload.wikimedia.org/wikipedia/commons/d/de/HBO_Max_logo.svg'],
        10 => ['name' => 'Amazon Prime Video', 'icon' => 'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg'],
        2 => ['name' => 'Apple iTunes', 'icon' => ''],
        3 => ['name' => 'Google Play Movies', 'icon' => ''],
    ];

    public function __construct(protected TmdbService $tmdb) {}

    public function index()
    {
        $platforms = $this->platforms;
        return view('platform.index', compact('platforms'));
    }

    public function show(int $providerId)
    {
        $movies = $this->tmdb->discoverByPlatform($providerId);
        $platform = $this->platforms[$providerId] ?? ['name' => 'Platform #' . $providerId, 'icon' => ''];

        return view('platform.show', ['movies' => $movies, 'platform' => $platform, 'providerId' => $providerId]);
    }

    public function filter(Request $request)
    {
        $providers = $request->input('providers', []);
        $allResults = [];

        foreach ($providers as $providerId) {
            $data = $this->tmdb->discoverByPlatform((int) $providerId);
            $platformName = $this->platforms[$providerId]['name'] ?? "Platform #$providerId";
            foreach (($data['results'] ?? []) as $movie) {
                $movie['_platform'] = $platformName;
                $allResults[] = $movie;
            }
        }

        usort($allResults, fn($a, $b) => ($b['popularity'] ?? 0) <=> ($a['popularity'] ?? 0));

        $platformNames = array_map(fn($id) => $this->platforms[$id]['name'] ?? "Platform #$id", $providers);

        return view('platform.show', [
            'movies' => ['results' => $allResults],
            'platform' => ['name' => implode(' + ', $platformNames), 'icon' => ''],
            'providerId' => null,
        ]);
    }
}
