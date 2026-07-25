@extends('layouts.app')

@section('title', 'Genres')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-6">🎯 Movie Genres</h1>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        @forelse($genres['genres'] ?? [] as $genre)
        <a href="{{ route('genre.show', $genre['id']) }}"
           class="bg-dark-100 hover:bg-dark-300 border border-white/10 hover:border-green-500 rounded-xl p-6 text-center transition-all group">
            <div class="text-3xl mb-2">
                @php $emojis = ['Action' => '💥', 'Adventure' => '🗺️', 'Animation' => '🐭', 'Comedy' => '😂', 'Crime' => '🔫', 'Documentary' => '📽️', 'Drama' => '🎭', 'Family' => '👨‍👩‍👧‍👦', 'Fantasy' => '🧙', 'History' => '📜', 'Horror' => '👻', 'Music' => '🎵', 'Mystery' => '🔍', 'Romance' => '💕', 'Science Fiction' => '🚀', 'TV Movie' => '📺', 'Thriller' => '🎯', 'War' => '⚔️', 'Western' => '🤠'] @endphp
                {{ $emojis[$genre['name']] ?? '🎬' }}
            </div>
            <h3 class="font-semibold group-hover:text-green-500 transition-colors">{{ $genre['name'] }}</h3>
        </a>
        @empty
        <p class="col-span-full text-center text-gray-400 py-20">No genres found.</p>
        @endforelse
    </div>
</div>
@endsection
