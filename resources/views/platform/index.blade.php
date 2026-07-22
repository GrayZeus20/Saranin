@extends('layouts.app')

@section('title', 'Streaming Platforms')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-6">📺 Streaming Platforms</h1>
    <p class="text-gray-400 mb-8">Browse movies available on your favorite streaming platforms.</p>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        @foreach($platforms as $id => $platform)
        <a href="{{ route('platform.show', $id) }}" 
           class="bg-dark-100 border border-white/10 hover:border-primary rounded-2xl p-6 transition-all group">
            <div class="flex items-center gap-4">
                @if(!empty($platform['icon']))
                <img src="{{ $platform['icon'] }}" 
                     alt="{{ $platform['name'] }}" 
                     class="h-10 object-contain brightness-0 invert"
                     onerror="this.style.display='none'">
                @endif
                <div>
                    <h3 class="text-lg font-bold group-hover:text-primary transition-colors">{{ $platform['name'] }}</h3>
                    <p class="text-sm text-gray-400">Browse movies →</p>
                </div>
            </div>
        </a>
        @endforeach
    </div>
</div>
@endsection
