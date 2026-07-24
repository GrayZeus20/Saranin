@extends('layouts.app')

@section('title', 'Statistics')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-8">📊 Statistics</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <section class="bg-dark-100 border border-white/10 rounded-2xl p-6">
            <h2 class="text-xl font-bold mb-4">🔥 Trending Movies</h2>
            <div class="space-y-3">
                @foreach(array_slice($trending['results'] ?? [], 0, 10) as $i => $movie)
                <a href="{{ route('movie.show', $movie['id']) }}" class="flex items-center gap-4 group">
                    <span class="text-2xl font-bold text-gray-600 w-8">{{ $i + 1 }}</span>
                    <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '', 'w92') }}" class="w-10 h-14 rounded object-cover">
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold group-hover:text-primary truncate">{{ $movie['title'] ?? $movie['name'] ?? 'Unknown' }}</p>
                        <p class="text-sm text-gray-400">{{ number_format($movie['popularity'] ?? 0) }} popularity</p>
                    </div>
                </a>
                @endforeach
            </div>
        </section>

        <section class="bg-dark-100 border border-white/10 rounded-2xl p-6">
            <h2 class="text-xl font-bold mb-4">🎭 Genres</h2>
            <div class="flex flex-wrap gap-3">
                @foreach(($genres['genres'] ?? []) as $genre)
                <a href="{{ route('genre.show', $genre['id']) }}"
                   class="bg-dark-300 hover:bg-primary border border-white/10 px-4 py-2 rounded-full text-sm transition-all">
                    {{ $genre['name'] }}
                </a>
                @endforeach
            </div>
        </section>

        <section class="bg-dark-100 border border-white/10 rounded-2xl p-6">
            <h2 class="text-xl font-bold mb-4">⭐ Top Rated</h2>
            <div class="space-y-3">
                @foreach(array_slice($trending['results'] ?? [], 0, 10) as $i => $movie)
                <a href="{{ route('movie.show', $movie['id']) }}" class="flex items-center gap-4 group">
                    <span class="text-lg font-bold text-gray-600 w-8">{{ $i + 1 }}</span>
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold group-hover:text-primary truncate">{{ $movie['title'] ?? 'Unknown' }}</p>
                        <p class="text-sm text-gray-400">⭐ {{ number_format($movie['vote_average'] ?? 0, 1) }}</p>
                    </div>
                </a>
                @endforeach
            </div>
        </section>
    </div>
</div>
@endsection
