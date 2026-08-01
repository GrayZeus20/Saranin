<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MovieController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\PlatformController;
use App\Http\Controllers\GenreController;
use App\Http\Controllers\PersonController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\ApiController;

Route::get('/', [HomeController::class, 'index'])->name('home');

Route::get('/movie/{id}', [MovieController::class, 'show'])->name('movie.show');
Route::get('/trending', [MovieController::class, 'trending'])->name('movie.trending');
Route::get('/popular', [MovieController::class, 'popular'])->name('movie.popular');
Route::get('/top-rated', [MovieController::class, 'topRated'])->name('movie.topRated');

Route::get('/search', [SearchController::class, 'index'])->name('search');

Route::get('/platform', [PlatformController::class, 'index'])->name('platform.index');
Route::get('/platform/{id}', [PlatformController::class, 'show'])->name('platform.show');
Route::get('/platform-filter', [PlatformController::class, 'filter'])->name('platform.filter');

Route::get('/genre', [GenreController::class, 'index'])->name('genre.index');
Route::get('/genre/{id}', [GenreController::class, 'show'])->name('genre.show');

Route::get('/person/{id}', [PersonController::class, 'show'])->name('person.show');

Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar');

Route::get('/stats', [StatsController::class, 'index'])->name('stats');

Route::get('/watchlist', function () {
    return view('watchlist.index');
})->name('watchlist');

Route::post('/api/view-log', [ApiController::class, 'logView'])->name('api.viewLog');
