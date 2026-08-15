@extends('layouts.app')

@section('title', 'Statistics')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
        <h1 class="text-3xl md:text-4xl font-bold text-white tracking-tight">Statistics</h1>
        <p class="text-slate-400 text-sm mt-1">A quick look at what's trending</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {{-- Trending --}}
        <section class="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
            <h2 class="text-lg font-bold text-white mb-4">Trending movies</h2>
            <div class="space-y-1">
                @foreach(array_slice($trending['results'] ?? [], 0, 10) as $i => $movie)
                <a href="{{ route('movie.show', $movie['id']) }}" class="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/5 transition-all group">
                    <span class="text-sm font-bold text-slate-400 w-6 text-right tabular-nums">{{ $i + 1 }}</span>
                    <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '', 'w92') }}"
                         alt="{{ $movie['title'] ?? $movie['name'] ?? 'Unknown' }}"
                         loading="lazy"
                         class="w-9 h-[52px] rounded-lg object-cover flex-shrink-0 border border-white/5">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-slate-300 group-hover:text-white truncate transition-colors">{{ $movie['title'] ?? $movie['name'] ?? 'Unknown' }}</p>
                        <p class="text-xs text-slate-400">{{ number_format($movie['popularity'] ?? 0) }} popularity</p>
                    </div>
                </a>
                @endforeach
            </div>
        </section>

        {{-- Top Rated --}}
        <section class="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
            <h2 class="text-lg font-bold text-white mb-4">Top rated</h2>
            <div class="space-y-1">
                @foreach(array_slice($popular['results'] ?? [], 0, 10) as $i => $movie)
                <a href="{{ route('movie.show', $movie['id']) }}" class="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/5 transition-all group">
                    <span class="text-sm font-bold text-slate-400 w-6 text-right tabular-nums">{{ $i + 1 }}</span>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-slate-300 group-hover:text-white truncate transition-colors">{{ $movie['title'] ?? 'Unknown' }}</p>
                        <p class="text-xs text-amber-400 font-medium">{{ number_format($movie['vote_average'] ?? 0, 1) }}</p>
                    </div>
                </a>
                @endforeach
            </div>
        </section>

        {{-- Genres --}}
        <section class="bg-slate-900/50 border border-white/5 rounded-2xl p-5 lg:col-span-2">
            <h2 class="text-lg font-bold text-white mb-4">Browse by genre</h2>
            <div class="flex flex-wrap gap-2">
                @foreach(($genres['genres'] ?? []) as $genre)
                <a href="{{ route('genre.show', $genre['id']) }}"
                   class="bg-white/5 hover:bg-accent/20 hover:text-accent border border-white/5 hover:border-accent/30 px-3.5 py-2 rounded-xl text-sm font-medium transition-all">
                    {{ $genre['name'] }}
                </a>
                @endforeach
            </div>
        </section>
    </div>
</div>
@endsection
