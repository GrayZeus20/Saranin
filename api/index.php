<?php

// Vercel's filesystem is read-only except for /tmp, so Laravel's writable
// directories are relocated there before the framework boots.
foreach ([
    '/tmp/storage/framework/views',
    '/tmp/storage/framework/cache',
    '/tmp/storage/framework/sessions',
    '/tmp/storage/logs',
] as $directory) {
    if (! is_dir($directory)) {
        mkdir($directory, 0755, true);
    }
}

require __DIR__.'/../public/index.php';
