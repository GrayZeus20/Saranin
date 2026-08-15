@extends('layouts.app')

@section('title', $platform['name'])

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
        <h1 class="text-3xl md:text-4xl font-bold text-white tracking-tight">{{ $platform['name'] }}</h1>
        <p class="text-slate-400 text-sm mt-1">Movies available on this platform</p>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
        @forelse($movies['results'] ?? [] as $movie)
            @include('partials.movie-card', compact('movie'))
        @empty
            <div class="col-span-full text-center py-20">
                <p class="text-slate-400 text-lg mb-1">No movies available</p>
                <p class="text-slate-400 text-sm">Check back later for new releases</p>
            </div>
        @endforelse
    </div>
    @if(isset($movies['total_pages']))
        <x-pagination :currentPage="$movies['page'] ?? 1" :lastPage="$movies['total_pages'] ?? 1" />
    @endif
</div>
@endsection
