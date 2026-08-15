@extends('layouts.app')

@section('title', 'Release Calendar')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
        <h1 class="text-3xl md:text-4xl font-bold text-white tracking-tight">Release calendar</h1>
        <p class="text-slate-400 text-sm mt-1">What's playing and what's coming</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section class="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
            <div class="flex items-center gap-2 mb-4">
                <span class="w-2 h-2 bg-green-400 rounded-full"></span>
                <h2 class="text-lg font-bold text-white">Now playing</h2>
            </div>
            <div class="space-y-2">
                @forelse($nowPlaying['results'] ?? [] as $movie)
                <a href="{{ route('movie.show', $movie['id']) }}" class="flex gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-all group">
                    <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '', 'w185') }}"
                         alt="{{ $movie['title'] }}"
                         class="w-14 h-[84px] rounded-lg object-cover flex-shrink-0 border border-white/5"
                         loading="lazy"
                         onerror="this.src='/img/no-poster.svg'">
                    <div class="flex-1 min-w-0">
                        <h3 class="text-sm font-semibold text-slate-300 group-hover:text-white truncate transition-colors">{{ $movie['title'] }}</h3>
                        <p class="text-xs text-slate-400 mt-0.5">{{ $movie['release_date'] ?? 'TBA' }}</p>
                        @if(!empty($movie['overview']))
                        <p class="text-xs text-slate-400 line-clamp-2 mt-1">{{ $movie['overview'] }}</p>
                        @endif
                    </div>
                </a>
                @empty
                <p class="text-slate-400 text-sm py-4">No movies currently playing.</p>
                @endforelse
            </div>
        </section>

        <section class="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
            <div class="flex items-center gap-2 mb-4">
                <span class="w-2 h-2 bg-amber-400 rounded-full"></span>
                <h2 class="text-lg font-bold text-white">Upcoming</h2>
            </div>
            <div class="space-y-2">
                @forelse($upcoming['results'] ?? [] as $movie)
                <a href="{{ route('movie.show', $movie['id']) }}" class="flex gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-all group">
                    <img src="{{ app(App\Services\TmdbService::class)->imageUrl($movie['poster_path'] ?? '', 'w185') }}"
                         alt="{{ $movie['title'] }}"
                         class="w-14 h-[84px] rounded-lg object-cover flex-shrink-0 border border-white/5"
                         loading="lazy"
                         onerror="this.src='/img/no-poster.svg'">
                    <div class="flex-1 min-w-0">
                        <h3 class="text-sm font-semibold text-slate-300 group-hover:text-white truncate transition-colors">{{ $movie['title'] }}</h3>
                        <p class="text-xs text-slate-400 mt-0.5">{{ $movie['release_date'] ?? 'TBA' }}</p>
                        @if(!empty($movie['overview']))
                        <p class="text-xs text-slate-400 line-clamp-2 mt-1">{{ $movie['overview'] }}</p>
                        @endif
                    </div>
                </a>
                @empty
                <p class="text-slate-400 text-sm py-4">No upcoming movies found.</p>
                @endforelse
            </div>
        </section>
    </div>
</div>
@endsection
