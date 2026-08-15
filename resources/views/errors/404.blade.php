@extends('layouts.app')

@section('title', 'Page not found')

@section('content')
<div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
    <p class="text-accent font-semibold tracking-widest text-sm mb-3">404</p>
    <h1 class="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">Page not found</h1>
    <p class="text-slate-400 text-sm mb-8">The page you are looking for does not exist or has been moved.</p>

    <form action="{{ url(route('search', [], false)) }}" method="GET" class="relative max-w-sm mx-auto mb-8">
        <input type="text" name="q" placeholder="Search movies..."
               class="w-full bg-white/5 text-white placeholder-slate-400 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-1 focus:ring-accent/40 focus:bg-white/10 text-sm border border-white/5">
        <svg class="absolute left-3 top-3.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
    </form>

    <a href="{{ route('home') }}"
       class="inline-flex items-center gap-2 bg-accent hover:bg-opacity-90 text-slate-900 px-5 py-3 rounded-xl font-semibold text-sm transition-all">
        Back to home
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    </a>
</div>
@endsection
