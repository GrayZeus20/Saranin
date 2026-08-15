@extends('layouts.app')

@section('title', $query ? "Search: $query" : 'Search')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6">Search</h1>

    <form action="{{ url(route('search', [], false)) }}" method="GET" class="mb-8">
        <div class="relative max-w-xl">
            <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" name="q" value="{{ $query }}"
                   class="w-full bg-white/5 text-white placeholder-slate-500 rounded-2xl pl-11 pr-24 py-3.5 focus:outline-none focus:ring-1 focus:ring-accent/40 focus:bg-white/10 text-sm border border-white/5 transition-all"
                   placeholder="Search movies & TV shows..." autofocus>
            <button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 bg-accent hover:bg-opacity-90 text-slate-900 px-4 py-2 rounded-xl text-sm font-semibold transition-all">Search</button>
        </div>
        @error('q')
            <p class="text-red-400 text-xs mt-2">{{ $message }}</p>
        @enderror
    </form>

    @if($query)
        @if(!empty($results['results']))
            <p class="text-slate-400 text-sm mb-5">{{ number_format(count($results['results'])) }} {{ Str::plural('result', count($results['results'])) }} for "<span class="text-white">{{ $query }}</span>"</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                @foreach($results['results'] as $movie)
                    @include('partials.movie-card', ['movie' => $movie])
                @endforeach
            </div>
        @else
            <div class="text-center py-20">
                <p class="text-slate-400 text-lg mb-2">No results found for "{{ $query }}"</p>
                <p class="text-slate-500 text-sm">Try a different search term</p>
            </div>
        @endif
    @endif
</div>
@endsection
