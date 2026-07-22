@extends('layouts.app')

@section('title', 'Top Rated Movies')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-6">🏆 Top Rated Movies</h1>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        @forelse($movies['results'] ?? [] as $movie)
            @include('partials.movie-card', compact('movie'))
        @empty
            <p class="col-span-full text-center text-gray-400 py-20">No movies found.</p>
        @endforelse
    </div>
</div>
@endsection
