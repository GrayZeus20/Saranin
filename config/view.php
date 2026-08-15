<?php

$compiledPath = storage_path('framework/views');

if (! is_dir($compiledPath) || ! is_writable($compiledPath)) {
    $compiledPath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'laravel_views';
}

if (! is_dir($compiledPath)) {
    @mkdir($compiledPath, 0755, true);
}

return [

    'paths' => [
        resource_path('views'),
    ],

    'compiled' => $compiledPath,

];
