@extends('layouts.app')

@section('title', 'Statistics')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-8">📊 Statistics Dashboard</h1>

    {{-- Overview Cards --}}
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div class="bg-dark-100 border border-white/10 rounded-2xl p-6">
            <p class="text-gray-400 text-sm">Total Searches</p>
            <p class="text-3xl font-bold text-primary">{{ number_format($totalSearches) }}</p>
        </div>
        <div class="bg-dark-100 border border-white/10 rounded-2xl p-6">
            <p class="text-gray-400 text-sm">Total Movie Views</p>
            <p class="text-3xl font-bold text-yellow-400">{{ number_format($totalViews) }}</p>
        </div>
        <div class="bg-dark-100 border border-white/10 rounded-2xl p-6">
            <p class="text-gray-400 text-sm">Genres Tracked</p>
            <p class="text-3xl font-bold text-green-400">{{ $totalGenres }}</p>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {{-- Top Searches --}}
        <section class="bg-dark-100 border border-white/10 rounded-2xl p-6">
            <h2 class="text-xl font-bold mb-4">🔥 Most Searched</h2>
            @if($topSearches->count() > 0)
            <div class="space-y-3">
                @foreach($topSearches as $i => $log)
                <div class="flex items-center gap-4">
                    <span class="text-2xl font-bold text-gray-600 w-8">{{ $i + 1 }}</span>
                    <div class="flex-1">
                        <a href="{{ route('search', ['q' => $log->query]) }}" class="font-semibold hover:text-primary">{{ $log->query }}</a>
                        <div class="w-full bg-white/5 rounded-full h-2 mt-1">
                            <div class="bg-primary h-2 rounded-full" style="width: {{ min(100, ($log->count / $topSearches->first()->count) * 100) }}%"></div>
                        </div>
                    </div>
                    <span class="text-sm text-gray-400">{{ $log->count }}x</span>
                </div>
                @endforeach
            </div>
            @else
            <p class="text-gray-400 text-center py-8">No search data yet</p>
            @endif
        </section>

        {{-- Top Viewed --}}
        <section class="bg-dark-100 border border-white/10 rounded-2xl p-6">
            <h2 class="text-xl font-bold mb-4">👁️ Most Viewed</h2>
            @if($topViews->count() > 0)
            <div class="space-y-3">
                @foreach($topViews as $i => $log)
                <a href="{{ route('movie.show', $log->tmdb_id) }}" class="flex items-center gap-4 group">
                    <span class="text-2xl font-bold text-gray-600 w-8">{{ $i + 1 }}</span>
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold group-hover:text-primary truncate">{{ $log->title }}</p>
                        <div class="w-full bg-white/5 rounded-full h-2 mt-1">
                            <div class="bg-yellow-400 h-2 rounded-full" style="width: {{ min(100, ($log->view_count / $topViews->first()->view_count) * 100) }}%"></div>
                        </div>
                    </div>
                    <span class="text-sm text-gray-400">{{ $log->view_count }}x</span>
                </a>
                @endforeach
            </div>
            @else
            <p class="text-gray-400 text-center py-8">No view data yet</p>
            @endif
        </section>

        {{-- Top Genres --}}
        <section class="bg-dark-100 border border-white/10 rounded-2xl p-6">
            <h2 class="text-xl font-bold mb-4">🎭 Most Popular Genres</h2>
            @if($topGenres->count() > 0)
            <div class="space-y-3">
                @foreach($topGenres as $i => $genre)
                <div class="flex items-center gap-4">
                    <span class="text-2xl font-bold text-gray-600 w-8">{{ $i + 1 }}</span>
                    <div class="flex-1">
                        <a href="{{ route('genre.show', $genre->genre_id) }}" class="font-semibold hover:text-primary">{{ $genre->genre_name }}</a>
                        <div class="w-full bg-white/5 rounded-full h-2 mt-1">
                            <div class="bg-green-400 h-2 rounded-full" style="width: {{ min(100, ($genre->view_count / $topGenres->first()->view_count) * 100) }}%"></div>
                        </div>
                    </div>
                    <span class="text-sm text-gray-400">{{ $genre->view_count }}x</span>
                </div>
                @endforeach
            </div>
            @else
            <p class="text-gray-400 text-center py-8">No genre data yet</p>
            @endif
        </section>

        {{-- Recent Activity --}}
        <section class="bg-dark-100 border border-white/10 rounded-2xl p-6">
            <h2 class="text-xl font-bold mb-4">📋 Recent Activity</h2>
            <div class="space-y-2 text-sm">
                @if($recentSearches->count() > 0)
                <h3 class="text-gray-400 font-semibold mt-3">Recent Searches</h3>
                @foreach($recentSearches as $log)
                <div class="flex justify-between">
                    <a href="{{ route('search', ['q' => $log->query]) }}" class="hover:text-primary">{{ $log->query }}</a>
                    <span class="text-gray-500">{{ $log->updated_at->diffForHumans() }}</span>
                </div>
                @endforeach
                @endif
                @if($recentViews->count() > 0)
                <h3 class="text-gray-400 font-semibold mt-3">Recent Views</h3>
                @foreach($recentViews as $log)
                <div class="flex justify-between">
                    <a href="{{ route('movie.show', $log->tmdb_id) }}" class="hover:text-primary">{{ $log->title }}</a>
                    <span class="text-gray-500">{{ $log->updated_at->diffForHumans() }}</span>
                </div>
                @endforeach
                @endif
                @if($recentSearches->count() == 0 && $recentViews->count() == 0)
                <p class="text-gray-400 text-center py-8">No activity yet. Start browsing!</p>
                @endif
            </div>
        </section>
    </div>
</div>
@endsection
