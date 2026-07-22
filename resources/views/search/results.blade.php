@extends('layouts.app')

@section('title', $query ? "Search: $query" : 'Search')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-6">🔍 Search</h1>

    <form action="{{ route('search') }}" method="GET" class="mb-8">
        <div class="flex gap-2">
            <input type="text" name="q" value="{{ $query }}"
                   class="flex-1 bg-white/10 text-white placeholder-gray-400 rounded-lg px-6 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                   placeholder="Search movies & TV shows..." autofocus>
            <button type="submit" class="bg-primary hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-all">Search</button>
        </div>
    </form>

    @if($query)
        @if(!empty($results['results']))
            <p class="text-gray-400 mb-4">{{ $results['total_results'] ?? 0 }} results found</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                @foreach($results['results'] as $movie)
                    @include('partials.movie-card', ['movie' => $movie])
                @endforeach
            </div>
        @else
            <p class="text-center text-gray-400 py-20">No results found for "{{ $query }}"</p>
        @endif
    @endif

    @if($topSearches->count() > 0)
    <div class="mt-12">
        <h2 class="text-xl font-bold mb-4">🔥 Top Searches</h2>
        <div class="flex flex-wrap gap-3">
            @foreach($topSearches as $log)
            <a href="{{ route('search', ['q' => $log->query]) }}"
               class="bg-dark-100 hover:bg-dark-300 border border-white/10 px-4 py-2 rounded-full text-sm transition-all flex items-center gap-2">
                {{ $log->query }}
                <span class="text-xs text-gray-500">{{ $log->count }}x</span>
            </a>
            @endforeach
        </div>
    </div>
    @endif
</div>
@endsection
