@extends('layouts.app')

@section('title', 'Home')

@section('content')
<div class="relative">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {{-- Hero Section --}}
        @if(!empty($trending['results']))
        <div class="relative h-[70vh] mb-10 rounded-2xl overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-t from-dark-200 via-transparent to-transparent z-10"></div>
            <img src="{{ app(App\Services\TmdbService::class)->imageUrl($trending['results'][0]['backdrop_path'], 'original') }}"
                alt="{{ $trending['results'][0]['title'] ?? '' }}"
                class="w-full h-full object-cover"
                onerror="this.src='https://via.placeholder.com/1280x720?text=MovieFlix'">
            <div class="absolute bottom-0 left-0 right-0 p-8 z-20">
                <h1 class="text-4xl md:text-6xl font-bold mb-2">{{ $trending['results'][0]['title'] ?? '' }}</h1>
                <p class="text-gray-300 text-lg mb-2 line-clamp-2">{{ $trending['results'][0]['overview'] ?? '' }}</p>
                <div class="flex items-center gap-4 text-sm">
                    @if(!empty($trending['results'][0]['vote_average']))
                    <span class="flex items-center gap-1 text-yellow-400">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        {{ number_format($trending['results'][0]['vote_average'], 1) }}
                    </span>
                    @endif
                    <span class="text-gray-400">{{ $trending['results'][0]['release_date'] ?? '' }}</span>
                </div>
                <div class="flex gap-3 mt-4">
                    <a href="{{ route('movie.show', $trending['results'][0]['id']) }}" class="bg-accent hover:bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all inline-flex items-center gap-2">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>
                        Detail
                    </a>
                    <button onclick="addRecentlyViewed({id:{{ $trending['results'][0]['id'] }},title:'{{ addslashes($trending['results'][0]['title']) }}',poster:'{{ app(App\Services\TmdbService::class)->imageUrl($trending['results'][0]['poster_path']) }}'})" class="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-6 py-2.5 rounded-lg font-semibold transition-all">+ Watchlist</button>
                </div>
            </div>
        </div>
        @endif

        {{-- Trending Now --}}
        <section class="mb-10">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold">🔥 Trending This Week</h2>
                <a href="{{ route('movie.trending') }}" class="text-accent hover:underline text-sm">View all</a>
            </div>
            <div class="scroll-container">
                @forelse($trending['results'] ?? [] as $movie)
                    @include('partials.movie-card', compact('movie'))
                @empty
                    @for($i=0; $i<8; $i++)
                        @include('partials.skeleton-card')
                    @endfor
                @endforelse
            </div>
        </section>

        {{-- Popular --}}
        <section class="mb-10">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold">⭐ Popular</h2>
                <a href="{{ route('movie.popular') }}" class="text-accent hover:underline text-sm">View all</a>
            </div>
            <div class="scroll-container">
                @forelse($popular['results'] ?? [] as $movie)
                    @include('partials.movie-card', compact('movie'))
                @empty
                    @for($i=0; $i<8; $i++)
                        @include('partials.skeleton-card')
                    @endfor
                @endforelse
            </div>
        </section>

        {{-- Now Playing --}}
        <section class="mb-10">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold">🎬 Now Playing</h2>
                <a href="{{ route('calendar') }}" class="text-accent hover:underline text-sm">View all</a>
            </div>
            <div class="scroll-container">
                @forelse($nowPlaying['results'] ?? [] as $movie)
                    @include('partials.movie-card', compact('movie'))
                @empty
                    @for($i=0; $i<8; $i++)
                        @include('partials.skeleton-card')
                    @endfor
                @endforelse
            </div>
        </section>

        {{-- Top Rated --}}
        <section class="mb-10">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold">🏆 Top Rated</h2>
                <a href="{{ route('movie.topRated') }}" class="text-accent hover:underline text-sm">View all</a>
            </div>
            <div class="scroll-container">
                @forelse($topRated['results'] ?? [] as $movie)
                    @include('partials.movie-card', compact('movie'))
                @empty
                    @for($i=0; $i<8; $i++)
                        @include('partials.skeleton-card')
                    @endfor
                @endforelse
            </div>
        </section>

        {{-- Upcoming --}}
        <section class="mb-10">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold">📅 Upcoming</h2>
                <a href="{{ route('calendar') }}" class="text-accent hover:underline text-sm">View all</a>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                @forelse($upcoming['results'] ?? [] as $movie)
                    @include('partials.movie-card', compact('movie'))
                @empty
                    @for($i=0; $i<6; $i++)
                        @include('partials.skeleton-card')
                    @endfor
                @endforelse
            </div>
        </section>

        {{-- Genres Section --}}
        @if(!empty($genres['genres']))
        <section>
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold">🎯 Genres</h2>
                <a href="{{ route('genre.index') }}" class="text-accent hover:underline text-sm">View all</a>
            </div>
            <div class="flex flex-wrap gap-3">
                @foreach($genres['genres'] as $genre)
                    <a href="{{ route('genre.show', $genre['id']) }}" class="bg-dark-100 hover:bg-dark-300 border border-white/10 px-4 py-2 rounded-full text-sm transition-all hover:border-accent">
                        {{ $genre['name'] }}
                    </a>
                @endforeach
            </div>
        </section>
        @endif
    </div>
</div>

@push('scripts')
<script>
    const heroMovie = @json($trending['results'][0] ?? null);
    if (heroMovie) {
        logView(heroMovie.id, heroMovie.title, 'movie', 
            heroMovie.genre_ids || [], 
            []
        );
    }
</script>
@endpush
@endsection
