@extends('layouts.app')

@section('title', 'Top Rated Movies')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
        <h1 class="text-3xl md:text-4xl font-bold text-white tracking-tight">Top rated movies</h1>
        <p class="text-slate-500 text-sm mt-1">The highest rated films of all time</p>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
        @forelse($movies['results'] ?? [] as $movie)
            @include('partials.movie-card', compact('movie'))
        @empty
            <p class="col-span-full text-center text-slate-500 py-20">No movies found.</p>
        @endforelse
    </div>
    <x-pagination :currentPage="$movies['page'] ?? 1" :lastPage="$movies['total_pages'] ?? 1" />
</div>
@endsection
