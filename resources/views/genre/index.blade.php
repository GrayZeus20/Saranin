@extends('layouts.app')

@section('title', 'Genres')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
        <h1 class="text-3xl md:text-4xl font-bold text-white tracking-tight">Movie genres</h1>
        <p class="text-slate-400 text-sm mt-1">Browse by your favorite genre</p>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        @forelse($genres['genres'] ?? [] as $genre)
        <a href="{{ route('genre.show', $genre['id']) }}"
           class="bg-slate-900/50 hover:bg-accent/10 border border-white/5 hover:border-accent/30 rounded-2xl p-6 text-center transition-all group">
            @php $emojis = ['Action' => '💥', 'Adventure' => '🗺️', 'Animation' => '🐭', 'Comedy' => '😂', 'Crime' => '🔫', 'Documentary' => '📽️', 'Drama' => '🎭', 'Family' => '👨‍👩‍👧‍👦', 'Fantasy' => '🧙', 'History' => '📜', 'Horror' => '👻', 'Music' => '🎵', 'Mystery' => '🔍', 'Romance' => '💕', 'Science Fiction' => '🚀', 'TV Movie' => '📺', 'Thriller' => '🎯', 'War' => '⚔️', 'Western' => '🤠'] @endphp
            <div class="text-2xl mb-2.5">{{ $emojis[$genre['name']] ?? '🎬' }}</div>
            <h3 class="text-sm font-semibold text-slate-300 group-hover:text-accent transition-colors">{{ $genre['name'] }}</h3>
        </a>
        @empty
        <p class="col-span-full text-center text-slate-400 py-20">No genres found.</p>
        @endforelse
    </div>
</div>
@endsection
