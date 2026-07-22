<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class TmdbService
{
    protected string $baseUrl;
    protected string $token;
    protected string $imageUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.tmdb.base_url');
        $this->token = config('services.tmdb.token');
        $this->imageUrl = config('services.tmdb.image_url');
    }

    public function imageUrl(string $path, string $size = 'w500'): string
    {
        return $path ? "{$this->imageUrl}/{$size}{$path}" : 'https://via.placeholder.com/500x750?text=No+Image';
    }

    public function get(string $endpoint, array $params = []): array
    {
        $cacheKey = 'tmdb_' . md5($endpoint . json_encode($params));

        return Cache::remember($cacheKey, 3600, function () use ($endpoint, $params) {
            $response = Http::withToken($this->token)
                ->get("{$this->baseUrl}{$endpoint}", $params);

            if ($response->failed()) {
                return ['error' => true, 'message' => $response->body()];
            }

            return $response->json();
        });
    }

    public function popularMovies(int $page = 1): array
    {
        return $this->get('/movie/popular', ['page' => $page, 'language' => 'id-ID']);
    }

    public function trendingMovies(string $timeWindow = 'week', int $page = 1): array
    {
        return $this->get("/trending/movie/{$timeWindow}", ['page' => $page]);
    }

    public function topRatedMovies(int $page = 1): array
    {
        return $this->get('/movie/top_rated', ['page' => $page, 'language' => 'id-ID']);
    }

    public function nowPlayingMovies(int $page = 1): array
    {
        return $this->get('/movie/now_playing', ['page' => $page, 'language' => 'id-ID']);
    }

    public function upcomingMovies(int $page = 1): array
    {
        return $this->get('/movie/upcoming', ['page' => $page, 'language' => 'id-ID']);
    }

    public function movieDetail(int $id): array
    {
        return $this->get("/movie/{$id}", ['append_to_response' => 'videos,credits,recommendations,watch/providers', 'language' => 'id-ID']);
    }

    public function searchMovies(string $query, int $page = 1): array
    {
        return $this->get('/search/movie', ['query' => $query, 'page' => $page, 'language' => 'id-ID']);
    }

    public function searchMulti(string $query, int $page = 1): array
    {
        return $this->get('/search/multi', ['query' => $query, 'page' => $page, 'language' => 'id-ID']);
    }

    public function movieRecommendations(int $movieId, int $page = 1): array
    {
        return $this->get("/movie/{$movieId}/recommendations", ['page' => $page, 'language' => 'id-ID']);
    }

    public function personDetail(int $id): array
    {
        return $this->get("/person/{$id}", ['append_to_response' => 'movie_credits', 'language' => 'id-ID']);
    }

    public function genres(): array
    {
        return $this->get('/genre/movie/list', ['language' => 'id-ID']);
    }

    public function discoverByGenre(int $genreId, int $page = 1): array
    {
        return $this->get('/discover/movie', [
            'with_genres' => $genreId,
            'page' => $page,
            'language' => 'id-ID',
            'sort_by' => 'popularity.desc',
        ]);
    }

    public function discoverByPlatform(int $providerId, int $page = 1): array
    {
        return $this->get('/discover/movie', [
            'with_watch_providers' => $providerId,
            'watch_region' => 'ID',
            'page' => $page,
            'language' => 'id-ID',
            'sort_by' => 'popularity.desc',
        ]);
    }

    public function platformProviders(): array
    {
        return $this->get('/watch/providers/movie', ['language' => 'id-ID', 'watch_region' => 'ID']);
    }

    public function moviesByYear(int $year, int $page = 1): array
    {
        return $this->get('/discover/movie', [
            'primary_release_year' => $year,
            'page' => $page,
            'language' => 'id-ID',
            'sort_by' => 'popularity.desc',
        ]);
    }

    public function topRatedMoviesAllTime(int $page = 1): array
    {
        return $this->get('/movie/top_rated', ['page' => $page, 'language' => 'id-ID']);
    }
}
