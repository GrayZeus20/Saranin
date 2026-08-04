@props(['currentPage', 'lastPage'])

@if($lastPage > 1)
<div class="flex justify-center items-center gap-2 mt-10 mb-6">
    {{-- Previous Button --}}
    @if($currentPage > 1)
        <a href="{{ request()->fullUrlWithQuery(['page' => $currentPage - 1]) }}"
           class="px-4 py-2 bg-dark-100 hover:bg-dark-300 rounded-lg text-sm transition-colors border border-white/10 hover:border-green-500">
            &laquo; Prev
        </a>
    @else
        <span class="px-4 py-2 bg-dark-100 rounded-lg text-sm text-gray-600 border border-white/5 cursor-not-allowed">
            &laquo; Prev
        </span>
    @endif

    {{-- Page Numbers --}}
    @php
        $start = max(1, $currentPage - 2);
        $end = min($lastPage, $currentPage + 2);
    @endphp

    @if($start > 1)
        <a href="{{ request()->fullUrlWithQuery(['page' => 1]) }}"
           class="px-3 py-2 bg-dark-100 hover:bg-dark-300 rounded-lg text-sm transition-colors border border-white/10 hover:border-green-500">
            1
        </a>
        @if($start > 2)
            <span class="px-2 text-gray-500">...</span>
        @endif
    @endif

    @for($i = $start; $i <= $end; $i++)
        @if($i == $currentPage)
            <span class="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold">{{ $i }}</span>
        @else
            <a href="{{ request()->fullUrlWithQuery(['page' => $i]) }}"
               class="px-3 py-2 bg-dark-100 hover:bg-dark-300 rounded-lg text-sm transition-colors border border-white/10 hover:border-green-500">
                {{ $i }}
            </a>
        @endif
    @endfor

    @if($end < $lastPage)
        @if($end < $lastPage - 1)
            <span class="px-2 text-gray-500">...</span>
        @endif
        <a href="{{ request()->fullUrlWithQuery(['page' => $lastPage]) }}"
           class="px-3 py-2 bg-dark-100 hover:bg-dark-300 rounded-lg text-sm transition-colors border border-white/10 hover:border-green-500">
            {{ $lastPage }}
        </a>
    @endif

    {{-- Next Button --}}
    @if($currentPage < $lastPage)
        <a href="{{ request()->fullUrlWithQuery(['page' => $currentPage + 1]) }}"
           class="px-4 py-2 bg-dark-100 hover:bg-dark-300 rounded-lg text-sm transition-colors border border-white/10 hover:border-green-500">
            Next &raquo;
        </a>
    @else
        <span class="px-4 py-2 bg-dark-100 rounded-lg text-sm text-gray-600 border border-white/5 cursor-not-allowed">
            Next &raquo;
        </span>
    @endif
</div>
@endif
