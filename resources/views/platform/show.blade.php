@extends('layouts.app')

@section('title', $platform['name'])

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex items-center gap-4 mb-6">
        <h1 class="text-3xl font-bold">{{ $platform['name'] }}</h1>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        @forelse($movies['results'] ?? [] as $movie)
            @include('partials.movie-card', compact('movie'))
        @empty
            <p class="col-span-full text-center text-gray-400 py-20">No movies available on this platform yet.</p>
        @endforelse
    </div>
    @if(isset($movies['total_pages']))
        <x-pagination :currentPage="$movies['page'] ?? 1" :lastPage="$movies['total_pages'] ?? 1" />
    @endif
</div>
@endsection
