<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Pin the TMDB endpoints so the suite never depends on the local .env.
     */
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.tmdb.token' => 'testing-token',
            'services.tmdb.base_url' => 'https://api.themoviedb.org/3',
            'services.tmdb.image_url' => 'https://image.tmdb.org/t/p',
        ]);
    }
}
