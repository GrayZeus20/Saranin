@extends('layouts.app')

@section('title', 'Home')

@section('content')
<div x-data="{ showFilter: false }" class="relative bg-[#020617]">
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16 space-y-14">

        {{-- FILTER POPUP --}}
        <div x-show="showFilter"
             x-cloak
             x-transition.opacity
             class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
             @click.away="showFilter = false">
            <div x-transition.scale
                 class="bg-slate-900/95 backdrop-blur-xl p-7 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl shadow-black/50">
                <div class="flex justify-between items-center mb-5">
                    <h2 class="text-xl font-bold text-white">Choose platforms</h2>
                    <button @click="showFilter = false" class="text-slate-500 hover:text-white transition-colors"><i class="fas fa-times"></i></button>
                </div>
                <form action="{{ route('platform.filter') }}" method="GET" class="space-y-3">
                    @foreach([8 => 'Netflix', 119 => 'Disney+', 384 => 'HBO Max', 10 => 'Prime Video'] as $id => $name)
                    <label class="flex items-center gap-3 p-3.5 bg-slate-800/60 rounded-xl cursor-pointer border border-white/5 hover:border-accent/40 transition-all group">
                        <input type="checkbox" name="providers[]" value="{{ $id }}" class="accent-[#4ADE80] w-4 h-4">
                        <span class="text-sm text-slate-300 font-medium group-hover:text-white transition-colors">{{ $name }}</span>
                    </label>
                    @endforeach
                    <button type="submit" class="w-full bg-accent py-3 rounded-xl font-bold text-slate-900 hover:bg-opacity-90 transition-all mt-3">Apply filter</button>
                </form>
            </div>
        </div>

        {{-- HERO --}}
        <div x-data="{ heroLoaded: false }" class="relative h-[72vh] min-h-[480px] rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5">
            <div x-show="!heroLoaded" x-transition.opacity class="absolute inset-0 skeleton bg-slate-800"></div>
            @if(!empty($trending['results']))
            <div class="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-[#020617]/10 z-10"></div>
            <img src="{{ app(App\Services\TmdbService::class)->imageUrl($trending['results'][0]['backdrop_path'], 'original') }}"
                alt="{{ $trending['results'][0]['title'] ?? '' }}"
                @load="heroLoaded = true"
                class="w-full h-full object-cover">
            <div class="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-20">
                <span class="inline-flex items-center gap-2 text-xs font-medium text-accent bg-accent/10 border border-accent/20 rounded-full px-3 py-1 mb-4">
                    <span class="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></span> Trending now
                </span>
                <h1 class="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight drop-shadow-lg max-w-3xl leading-tight">{{ $trending['results'][0]['title'] ?? '' }}</h1>
                <p class="text-slate-300 text-base md:text-lg max-w-2xl mb-7 leading-relaxed line-clamp-3">{{ $trending['results'][0]['overview'] ?? '' }}</p>
                <div class="flex flex-wrap gap-3">
                    <a href="{{ route('movie.show', $trending['results'][0]['id']) }}" class="inline-flex items-center gap-2 bg-accent hover:bg-opacity-90 text-slate-900 px-6 py-3 rounded-full font-bold transition-all transform hover:scale-[1.03]">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>
                        Watch
                    </a>
                </div>
            </div>
            @endif
        </div>

        {{-- SECTIONS --}}
        @php
            $sections = [
                ['title' => 'Trending now', 'subtitle' => 'What everyone is watching this week', 'data' => $trending['results'] ?? [], 'link' => route('movie.trending')],
                ['title' => 'Popular right now', 'subtitle' => 'Most loved films across all platforms', 'data' => $popular['results'] ?? [], 'link' => route('movie.popular')],
            ];
        @endphp

        @foreach($sections as $idx => $section)
        <section>
            <div class="flex items-end justify-between mb-5">
                <div>
                    <h2 class="text-2xl md:text-3xl font-bold text-white tracking-tight">{{ $section['title'] }}</h2>
                    <p class="text-slate-500 text-sm mt-1">{{ $section['subtitle'] }}</p>
                </div>
                <a href="{{ $section['link'] }}" class="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white font-medium transition-colors">
                    See all
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </a>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                @foreach($section['data'] as $movie)
                    @include('partials.movie-card', compact('movie'))
                @endforeach
            </div>
        </section>
        @endforeach

        {{-- FILTER CTA --}}
        <section class="rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/80 to-slate-950 p-8 md:p-12 text-center">
            <h2 class="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">Not sure where to start?</h2>
            <p class="text-slate-500 max-w-md mx-auto mb-6">Filter movies by the streaming platforms you already have.</p>
            <button @click="showFilter = true" class="inline-flex items-center gap-2 bg-white/10 hover:bg-accent hover:text-slate-900 px-6 py-3 rounded-full font-semibold transition-all">
                <i class="fas fa-filter text-sm"></i> Filter platforms
            </button>
        </section>
    </div>
</div>
@endsection