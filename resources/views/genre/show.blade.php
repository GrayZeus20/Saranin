@extends('layouts.app')

@section('title', $genreName ?: 'Genre')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-6">{{ $genreName ?: 'Genre' }} Movies</h1>
    <div class="flex flex-wrap gap-2 mb-6">
        @foreach($genres['genres'] ?? [] as $g)
        <a href="{{ route('genre.show', $g['id']) }}"
           class="px-4 py-2 rounded-full text-sm border transition-all {{ $g['name'] == $genreName ? 'bg-green-500 border-green-500 text-white' : 'bg-dark-100 border-white/10 hover:border-green-500 text-gray-300' }}">
            {{ $g['name'] }}
        </a>
        @endforeach
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        @forelse($movies['results'] ?? [] as $movie)
            @include('partials.movie-card', compact('movie'))
        @empty
            <p class="col-span-full text-center text-gray-400 py-20">No movies found in this genre.</p>
        @endforelse
    </div>
    <x-pagination :currentPage="$movies['page'] ?? 1" :lastPage="$movies['total_pages'] ?? 1" />
</div>
@endsection
