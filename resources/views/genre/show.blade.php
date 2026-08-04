@extends('layouts.app')

@section('title', $genreName ?: 'Genre')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-6">
        <h1 class="text-3xl md:text-4xl font-bold text-white tracking-tight">{{ $genreName ?: 'Genre' }} movies</h1>
    </div>
    <div class="flex flex-wrap gap-2 mb-8">
        @foreach($genres['genres'] ?? [] as $g)
        <a href="{{ route('genre.show', $g['id']) }}"
           class="px-3.5 py-1.5 rounded-xl text-sm font-medium border transition-all {{ $g['name'] == $genreName ? 'bg-accent text-slate-900 border-accent' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:border-white/20' }}">
            {{ $g['name'] }}
        </a>
        @endforeach
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
        @forelse($movies['results'] ?? [] as $movie)
            @include('partials.movie-card', compact('movie'))
        @empty
            <p class="col-span-full text-center text-slate-500 py-20">No movies found in this genre.</p>
        @endforelse
    </div>
    <x-pagination :currentPage="$movies['page'] ?? 1" :lastPage="$movies['total_pages'] ?? 1" />
</div>
@endsection
