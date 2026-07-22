@extends('layouts.app')

@section('title', 'Release Calendar')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-6">📅 Release Calendar</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
            <h2 class="text-xl font-bold mb-4">Now Playing</h2>
            <div class="space-y-4">
                @forelse($nowPlaying['results'] ?? [] as $movie)
                <a href="{{ route('movie.show', $movie['id']) }}" class="flex gap-4 bg-dark-100 rounded-xl p-4 hover:bg-dark-300 transition-colors group">
                    <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '', 'w185') }}"
                         alt="{{ $movie['title'] }}"
                         class="w-16 h-24 rounded-lg object-cover flex-shrink-0"
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/64x96?text=N/A'">
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold group-hover:text-primary truncate">{{ $movie['title'] }}</h3>
                        <p class="text-sm text-gray-400">{{ $movie['release_date'] ?? 'TBA' }}</p>
                        @if(!empty($movie['overview']))
                        <p class="text-sm text-gray-500 line-clamp-2 mt-1">{{ $movie['overview'] }}</p>
                        @endif
                    </div>
                </a>
                @empty
                <p class="text-gray-400">No movies currently playing.</p>
                @endforelse
            </div>
        </section>

        <section>
            <h2 class="text-xl font-bold mb-4">Upcoming</h2>
            <div class="space-y-4">
                @forelse($upcoming['results'] ?? [] as $movie)
                <a href="{{ route('movie.show', $movie['id']) }}" class="flex gap-4 bg-dark-100 rounded-xl p-4 hover:bg-dark-300 transition-colors group">
                    <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '', 'w185') }}"
                         alt="{{ $movie['title'] }}"
                         class="w-16 h-24 rounded-lg object-cover flex-shrink-0"
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/64x96?text=N/A'">
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold group-hover:text-primary truncate">{{ $movie['title'] }}</h3>
                        <p class="text-sm text-gray-400">{{ $movie['release_date'] ?? 'TBA' }}</p>
                        @if(!empty($movie['overview']))
                        <p class="text-sm text-gray-500 line-clamp-2 mt-1">{{ $movie['overview'] }}</p>
                        @endif
                    </div>
                </a>
                @empty
                <p class="text-gray-400">No upcoming movies found.</p>
                @endforelse
            </div>
        </section>
    </div>
</div>
@endsection
