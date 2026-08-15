<?php

namespace Tests\Feature;

use App\Services\TmdbService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TmdbServiceTest extends TestCase
{
    public function test_successful_responses_are_cached(): void
    {
        Http::fake(['api.themoviedb.org/*' => Http::response(['results' => ['ok']])]);

        $tmdb = app(TmdbService::class);
        $tmdb->popularMovies();
        $tmdb->popularMovies();

        Http::assertSentCount(1);
    }

    public function test_failed_responses_are_not_cached(): void
    {
        Http::fake(['api.themoviedb.org/*' => Http::sequence()
            ->push(['status_message' => 'rate limited'], 429)
            ->push(['status_message' => 'rate limited'], 429)
            ->push(['results' => ['ok']], 200),
        ]);

        $tmdb = app(TmdbService::class);
        $key = 'tmdb_'.md5('/movie/popular'.json_encode(['page' => 1, 'language' => 'id-ID']));

        $this->assertTrue($tmdb->popularMovies()['error']);
        $this->assertFalse(Cache::has($key));

        // A later request must be able to recover instead of serving the
        // cached error for an hour.
        $this->assertSame(['ok'], $tmdb->popularMovies()['results']);
    }

    public function test_image_url_falls_back_to_local_placeholder(): void
    {
        $tmdb = app(TmdbService::class);

        $this->assertStringEndsWith('/img/no-poster.svg', $tmdb->imageUrl(null));
        $this->assertSame('https://image.tmdb.org/t/p/w500/poster.jpg', $tmdb->imageUrl('/poster.jpg'));
    }
}
