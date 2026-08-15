@extends('layouts.app')

@section('title', 'Streaming Platforms')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
        <h1 class="text-3xl md:text-4xl font-bold text-white tracking-tight">Streaming platforms</h1>
        <p class="text-slate-400 text-sm mt-1">Browse movies by where you watch</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @foreach($platforms as $id => $platform)
        <a href="{{ route('platform.show', $id) }}"
           class="bg-slate-900/50 border border-white/5 hover:border-accent/30 rounded-2xl p-6 transition-all group">
            <div class="flex items-center gap-4">
                <span aria-hidden="true"
                      class="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl {{ $platform['color'] ?? 'bg-slate-700' }} text-white text-lg font-bold">
                    {{ mb_substr($platform['name'], 0, 1) }}
                </span>
                <div>
                    <h3 class="text-lg font-bold text-slate-300 group-hover:text-white transition-colors">{{ $platform['name'] }}</h3>
                    <p class="text-sm text-slate-400">Browse movies →</p>
                </div>
            </div>
        </a>
        @endforeach
    </div>
</div>
@endsection
