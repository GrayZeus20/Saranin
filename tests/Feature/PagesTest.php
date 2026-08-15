<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PagesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    private function fakeTmdb(): void
    {
        Http::fake([
            'api.themoviedb.org/3/genre/movie/list*' => Http::response([
                'genres' => [['id' => 28, 'name' => 'Action']],
            ]),
            'api.themoviedb.org/3/watch/providers/movie*' => Http::response(['results' => []]),
            'api.themoviedb.org/3/movie/550*' => Http::response($this->movieDetail()),
            'api.themoviedb.org/3/person/*' => Http::response(['id' => 1, 'name' => 'Someone', 'profile_path' => null]),
            'api.themoviedb.org/3/*' => Http::response(['page' => 1, 'results' => [$this->movie()], 'total_pages' => 1, 'total_results' => 1]),
        ]);
    }

    public function test_home_page_renders(): void
    {
        $this->fakeTmdb();

        $this->get('/')->assertOk()->assertSee('Fight Club');
    }

    /**
     * Poster and backdrop are null for many TMDB entries; the placeholder must
     * be used instead of blowing up with a TypeError.
     */
    public function test_home_page_renders_when_images_are_null(): void
    {
        Http::fake([
            'api.themoviedb.org/*' => Http::response([
                'page' => 1,
                'results' => [['id' => 1, 'title' => 'No Art', 'poster_path' => null, 'backdrop_path' => null]],
                'genres' => [],
            ]),
        ]);

        $this->get('/')->assertOk()->assertSee('/img/no-poster.svg');
    }

    public function test_listing_pages_render(): void
    {
        $this->fakeTmdb();

        foreach (['/trending', '/popular', '/top-rated', '/genre', '/genre/28', '/platform', '/platform/8', '/calendar', '/stats', '/watchlist'] as $uri) {
            $this->get($uri)->assertOk();
        }
    }

    public function test_movie_detail_renders(): void
    {
        $this->fakeTmdb();

        $this->get('/movie/550')->assertOk()->assertSee('Fight Club');
    }

    public function test_movie_detail_returns_404_when_tmdb_fails(): void
    {
        Http::fake(['api.themoviedb.org/*' => Http::response(['status_message' => 'Not found'], 404)]);

        $this->get('/movie/999999999')->assertNotFound();
    }

    public function test_search_requires_a_short_query(): void
    {
        $this->fakeTmdb();

        $this->get('/search')->assertOk();
        $this->get('/search?q='.str_repeat('a', 101))->assertSessionHasErrors('q');
    }

    public function test_search_hides_non_movie_results(): void
    {
        Http::fake([
            'api.themoviedb.org/*' => Http::response(['results' => [
                ['id' => 1, 'title' => 'A Movie', 'media_type' => 'movie'],
                ['id' => 2, 'name' => 'A Person', 'media_type' => 'person'],
            ]]),
        ]);

        $this->get('/search?q=a')->assertOk()->assertSee('A Movie')->assertDontSee('A Person');
    }

    public function test_platform_filter_rejects_unknown_providers(): void
    {
        $this->fakeTmdb();

        $this->get('/platform-filter?providers[]=999')->assertSessionHasErrors('providers.0');
        $this->get('/platform-filter?'.http_build_query(['providers' => array_fill(0, 6, 8)]))->assertSessionHasErrors('providers');
    }

    public function test_titles_with_quotes_do_not_break_inline_scripts(): void
    {
        Http::fake([
            'api.themoviedb.org/*' => Http::response([
                'results' => [['id' => 7, 'title' => "It's a \"Trap\" </script>", 'poster_path' => '/a.jpg', 'media_type' => 'movie']],
            ]),
        ]);

        $response = $this->get('/search?q=trap')->assertOk();

        $response->assertSee('\u003C\/script\u003E', false);
        $response->assertDontSee('It\'s a "Trap" </script>', false);
    }

    private function movie(): array
    {
        return [
            'id' => 550,
            'title' => 'Fight Club',
            'poster_path' => '/poster.jpg',
            'backdrop_path' => '/backdrop.jpg',
            'vote_average' => 8.4,
            'release_date' => '1999-10-15',
            'overview' => 'An insomniac office worker.',
            'popularity' => 61.4,
        ];
    }

    private function movieDetail(): array
    {
        return $this->movie() + [
            'genres' => [['id' => 18, 'name' => 'Drama']],
            'runtime' => 139,
            'videos' => ['results' => []],
            'credits' => ['cast' => []],
            'recommendations' => ['results' => []],
            'watch/providers' => ['results' => []],
        ];
    }
}
