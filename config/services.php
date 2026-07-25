<?php

return [
    'tmdb' => [
        'api_key' => env('TMDB_API_KEY', 'd8ed09125b4acb8b26c88b3bd2980f18'),
        'token' => env('TMDB_API_TOKEN', 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkOGVkMDkxMjViNGFjYjhiMjZjODhiM2JkMjk4MGYxOCIsIm5iZiI6MTc4NDY1NzczMC43NjMsInN1YiI6IjZhNWZiNzQyMDU1ZTk5MzU5NmQ2NDZlYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.fPGSvBH1VND-ULKPu2KqSzrzx_-5u_ZiwAZ8J903P4Q'),
        'base_url' => env('TMDB_BASE_URL', 'https://api.themoviedb.org/3'),
        'image_url' => env('TMDB_IMAGE_URL', 'https://image.tmdb.org/t/p'),
    ],
];
