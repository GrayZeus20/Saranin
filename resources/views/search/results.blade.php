@extends('layouts.app')

@section('title', $query ? "Search: $query" : 'Search')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-6">🔍 Search</h1>

    <form action="{{ route('search') }}" method="GET" class="mb-8">
        <div class="flex gap-2">
            <input type="text" name="q" value="{{ $query }}"
                   class="flex-1 bg-white/10 text-white placeholder-gray-400 rounded-lg px-6 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                   placeholder="Search movies & TV shows..." autofocus>
            <button type="submit" class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all">Search</button>
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

@endsection
