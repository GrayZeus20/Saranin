<?php

return [
    'tmdb' => [
        'api_key' => env('TMDB_API_KEY'),
        'token' => env('TMDB_API_TOKEN'),
        'base_url' => env('TMDB_BASE_URL', 'https://api.themoviedb.org/3'),
        'image_url' => env('TMDB_IMAGE_URL', 'https://image.tmdb.org/t/p'),
    ],
];
