import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ImageWithFallback } from './components/ImageWithFallback';
import Navbar from './components/Navbar';
import { fetchWithRateLimit, batchFetchWithRateLimit, IMG_BASE, TMDB_TOKEN } from './utils/api';
import { formatDate, GENRE_MAP } from './utils/constants';
// Environment validation
if (!TMDB_TOKEN) {
    console.error('Missing VITE_TMDB_TOKEN in .env file. API calls will fail.');
}
function normalizeTv(tv) {
    return {
        ...tv,
        title: tv.name || tv.title,
        release_date: tv.first_air_date || tv.release_date,
        media_type: 'tv',
        origin_country: tv.origin_country || [],
        status: tv.status || '',
    };
}
function normalizeMovie(movie) {
    return {
        ...movie,
        media_type: 'movie',
    };
}
function posterUrl(path, size = 'w342') {
    return path ? `${IMG_BASE}/${size}${path}` : '';
}
function SkeletonCard() {
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("div", { className: "skeleton w-full aspect-[2/3] rounded-xl" }), _jsx("div", { className: "skeleton h-5 w-3/4 rounded" }), _jsx("div", { className: "skeleton h-3 w-1/2 rounded" })] }));
}
function SkeletonHero() {
    return (_jsxs("div", { className: "relative w-full h-[50vh] sm:h-[60vh] md:h-[75vh] mb-12 md:mb-16", children: [_jsx("div", { className: "skeleton absolute inset-0 rounded-xl md:rounded-2xl" }), _jsxs("div", { className: "absolute bottom-0 left-0 right-0 p-5 sm:p-8 md:p-12", children: [_jsx("div", { className: "skeleton h-4 w-24 rounded mb-4" }), _jsx("div", { className: "skeleton h-8 sm:h-12 w-2/3 rounded mb-3" }), _jsx("div", { className: "skeleton h-4 w-1/2 rounded mb-6" }), _jsx("div", { className: "skeleton h-10 w-32 rounded-full" })] })] }));
}
function HorizontalSection({ title, subtitle, movies, onMovieClick, viewAllLink }) {
    const scrollRef = useRef(null);
    if (movies.length === 0)
        return null;
    const scroll = (direction) => {
        if (scrollRef.current) {
            const scrollAmount = scrollRef.current.clientWidth * 0.8;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };
    return (_jsxs("div", { className: "mb-10 md:mb-14 relative group", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex items-baseline gap-3", children: [_jsx("h2", { className: "text-lg sm:text-xl font-bold text-text-primary", children: title }), _jsx("p", { className: "text-text-muted text-xs", children: subtitle })] }), viewAllLink && (_jsx(Link, { to: viewAllLink, className: "text-accent text-xs font-bold hover:underline transition-colors", children: "View All" }))] }), _jsx("button", { onClick: () => scroll('left'), className: "absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "2", children: _jsx("polyline", { points: "15 18 9 12 15 6" }) }) }), _jsx("div", { ref: scrollRef, className: "flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide", children: movies.map(m => (_jsxs("div", { onClick: () => onMovieClick(m), className: "shrink-0 w-28 sm:w-32 md:w-36 cursor-pointer group", children: [_jsxs("div", { className: "relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]", children: [_jsx(ImageWithFallback, { src: posterUrl(m.poster_path), alt: m.title, className: "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" }), _jsxs("div", { className: "absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-accent text-[9px] font-mono font-bold px-1.5 py-0.5 rounded", children: ["\u2605 ", m.vote_average?.toFixed(1)] })] }), _jsx("p", { className: "text-text-primary text-[11px] font-bold line-clamp-1 mt-1.5", children: m.title })] }, `${title}-${m.id}`))) }), _jsx("button", { onClick: () => scroll('right'), className: "absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "2", children: _jsx("polyline", { points: "9 18 15 12 9 6" }) }) })] }));
}
export default function App() {
    const navigate = useNavigate();
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [trending, setTrending] = useState([]);
    const [popular, setPopular] = useState([]);
    const [topRated, setTopRated] = useState([]);
    const nowPlayingRef = useRef(null);
    const loadMoreRef = useRef(null);
    const ITEMS_PER_PAGE = 20;
    const INITIAL_PAGES = 5;
    const [maxPage, setMaxPage] = useState(INITIAL_PAGES);
    const [loadingMore, setLoadingMore] = useState(false);
    const isLoadingMoreRef = useRef(false);
    // Refs to track latest state for provider fetch (avoid stale closures)
    const moviesRef = useRef(movies);
    const trendingRef = useRef(trending);
    const popularRef = useRef(popular);
    const topRatedRef = useRef(topRated);
    useEffect(() => { moviesRef.current = movies; }, [movies]);
    useEffect(() => { trendingRef.current = trending; }, [trending]);
    useEffect(() => { popularRef.current = popular; }, [popular]);
    useEffect(() => { topRatedRef.current = topRated; }, [topRated]);
    // Shared fetch helper — returns movies for a page range
    const fetchCategoryPages = async (endpoint, pageStart, pageEnd) => {
        const pages = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);
        const endpoints = pages.map(p => `${endpoint}?language=en-US&page=${p}`);
        const results = await batchFetchWithRateLimit(endpoints);
        return results.flatMap(d => d.results || []);
    };
    const fetchCategory = async (endpoint, page) => {
        const data = await fetchWithRateLimit(`${endpoint}?language=en-US&page=${page}`);
        return data.results || [];
    };
    // Use React Query — fetch first 5 pages for all categories
    const { data: nowPlaying, error: nowPlayingError } = useQuery({
        queryKey: ['now_playing'],
        queryFn: () => fetchCategoryPages('/movie/now_playing', 1, INITIAL_PAGES),
        retry: 2,
        retryDelay: 1000,
    });
    const { data: trendingData, error: trendingError } = useQuery({
        queryKey: ['trending'],
        queryFn: () => fetchCategoryPages('/trending/movie/week', 1, INITIAL_PAGES),
        retry: 2,
        retryDelay: 1000,
    });
    const { data: popularData, error: popularError } = useQuery({
        queryKey: ['popular'],
        queryFn: () => fetchCategoryPages('/movie/popular', 1, INITIAL_PAGES),
        retry: 2,
        retryDelay: 1000,
    });
    const { data: topRatedData, error: topRatedError } = useQuery({
        queryKey: ['top_rated'],
        queryFn: () => fetchCategoryPages('/movie/top_rated', 1, INITIAL_PAGES),
        retry: 2,
        retryDelay: 1000,
    });
    // TV Series fetch — first 3 pages
    const { data: tvTrendingData } = useQuery({
        queryKey: ['tv_trending'],
        queryFn: () => fetchCategoryPages('/trending/tv/week', 1, 3),
        retry: 2,
        retryDelay: 1000,
    });
    const { data: tvPopularData } = useQuery({
        queryKey: ['tv_popular'],
        queryFn: () => fetchCategoryPages('/tv/popular', 1, 3),
        retry: 2,
        retryDelay: 1000,
    });
    const { data: tvTopRatedData } = useQuery({
        queryKey: ['tv_top_rated'],
        queryFn: () => fetchCategoryPages('/tv/top_rated', 1, 3),
        retry: 2,
        retryDelay: 1000,
    });
    const { data: tvOnAirData } = useQuery({
        queryKey: ['tv_on_air'],
        queryFn: () => fetchCategoryPages('/tv/on_the_air', 1, 3),
        retry: 2,
        retryDelay: 1000,
    });
    const [tvTrending, setTvTrending] = useState([]);
    const [tvPopular, setTvPopular] = useState([]);
    const [tvTopRated, setTvTopRated] = useState([]);
    const [tvOnAir, setTvOnAir] = useState([]);
    useEffect(() => {
        // Handle errors from main queries
        const queryError = nowPlayingError || trendingError || popularError || topRatedError;
        if (queryError) {
            setError(queryError.message || 'Failed to load content');
            setLoading(false);
            return;
        }
        if (nowPlaying && trendingData && popularData && topRatedData) {
            setMovies(nowPlaying.map(normalizeMovie));
            setTrending(trendingData.map(normalizeMovie));
            setPopular(popularData.map(normalizeMovie));
            setTopRated(topRatedData.map(normalizeMovie));
            setLoading(false);
        }
        if (tvTrendingData)
            setTvTrending(tvTrendingData.map(normalizeTv));
        if (tvPopularData)
            setTvPopular(tvPopularData.map(normalizeTv));
        if (tvTopRatedData)
            setTvTopRated(tvTopRatedData.map(normalizeTv));
        if (tvOnAirData)
            setTvOnAir(tvOnAirData.map(normalizeTv));
    }, [nowPlaying, trendingData, popularData, topRatedData, tvTrendingData, tvPopularData, tvTopRatedData, tvOnAirData, nowPlayingError, trendingError, popularError, topRatedError]);
    // Fetch watch providers for all movie categories when data loads
    useEffect(() => {
        if (moviesRef.current.length === 0)
            return;
        const allMovies = [...moviesRef.current, ...trendingRef.current, ...popularRef.current, ...topRatedRef.current];
        const seen = new Set();
        const unique = allMovies.filter(m => { if (seen.has(m.id))
            return false; seen.add(m.id); return true; });
        const fetchProviders = async () => {
            const updated = new Map();
            // Batch fetch with rate limiter (max 5 concurrent)
            const endpoints = unique.map(m => `/movie/${m.id}/watch/providers`);
            const results = await batchFetchWithRateLimit(endpoints);
            // Process results
            results.forEach((providerData, index) => {
                if (providerData) {
                    const movieId = unique[index].id;
                    const regionResults = providerData.results?.ID || {};
                    updated.set(movieId, regionResults.flatrate || regionResults.rent || regionResults.buy || []);
                }
            });
            // Only update if there are actual changes to avoid re-render cascade
            if (updated.size === 0)
                return;
            const updateList = (prev) => {
                let changed = false;
                const next = prev.map(m => {
                    const providers = updated.get(m.id);
                    if (providers && providers !== m.providers) {
                        changed = true;
                        return { ...m, providers };
                    }
                    return m;
                });
                return changed ? next : prev;
            };
            setMovies(updateList);
            setTrending(updateList);
            setPopular(updateList);
            setTopRated(updateList);
        };
        fetchProviders();
    }, []);
    // Infinite scroll — load next 2 pages when user scrolls to bottom
    useEffect(() => {
        if (loading || isLoadingMoreRef.current)
            return;
        const observer = new IntersectionObserver((entries) => {
            if (!entries[0].isIntersecting || isLoadingMoreRef.current)
                return;
            isLoadingMoreRef.current = true;
            setLoadingMore(true);
            const BATCH = 2;
            (async () => {
                try {
                    const pages = Array.from({ length: BATCH }, (_, i) => maxPage + 1 + i);
                    const [np, tr, pop, top] = await Promise.all([
                        Promise.all(pages.map(p => fetchCategory('/movie/now_playing', p))).then(r => r.flat()),
                        Promise.all(pages.map(p => fetchCategory('/trending/movie/week', p))).then(r => r.flat()),
                        Promise.all(pages.map(p => fetchCategory('/movie/popular', p))).then(r => r.flat()),
                        Promise.all(pages.map(p => fetchCategory('/movie/top_rated', p))).then(r => r.flat()),
                    ]);
                    const dedup = (prev, next) => {
                        const ids = new Set(prev.map(m => m.id));
                        return [...prev, ...next.filter(m => !ids.has(m.id))];
                    };
                    setMovies(prev => dedup(prev, np.map(normalizeMovie)));
                    setTrending(prev => dedup(prev, tr.map(normalizeMovie)));
                    setPopular(prev => dedup(prev, pop.map(normalizeMovie)));
                    setTopRated(prev => dedup(prev, top.map(normalizeMovie)));
                    setMaxPage(prev => prev + BATCH);
                }
                catch {
                    toast.error('Failed to load more content');
                }
                setLoadingMore(false);
                isLoadingMoreRef.current = false;
            })();
        }, { rootMargin: '400px' });
        if (loadMoreRef.current)
            observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [loading, maxPage]);
    const openDetail = (movie) => {
        navigate(`/${movie.media_type === 'tv' ? 'tv' : 'movie'}/${movie.id}`);
    };
    const [activeGenres, setActiveGenres] = useState([]);
    const [activeProviders, setActiveProviders] = useState([]);
    const [showGenres, setShowGenres] = useState(false);
    const [activeCategory, setActiveCategory] = useState('now_playing');
    const [contentType, setContentType] = useState('movie');
    // Defensive dedup for render
    const renderDedup = useCallback((movies) => {
        const seen = new Set();
        return movies.filter(m => { if (seen.has(m.id))
            return false; seen.add(m.id); return true; });
    }, []);
    const CATEGORIES = useMemo(() => [
        { key: 'now_playing', label: 'Now Playing', data: [...movies, ...tvOnAir] },
        { key: 'trending', label: 'Trending', data: [...trending, ...tvTrending] },
        { key: 'popular', label: 'Popular', data: [...popular, ...tvPopular] },
        { key: 'top_rated', label: 'Top Rated', data: [...topRated, ...tvTopRated] },
    ], [movies, tvOnAir, trending, popular, topRated, tvTrending, tvPopular, tvTopRated]);
    const baseMovies = useMemo(() => renderDedup(CATEGORIES.find(c => c.key === activeCategory)?.data || movies), [CATEGORIES, activeCategory, movies, renderDedup]);
    // Filter by contentType first to compute available genres dynamically
    const typeFilteredMovies = useMemo(() => baseMovies.filter(m => {
        const isJapaneseAnimation = m.genre_ids?.includes(16) && m.original_language === 'ja';
        if (contentType === 'all')
            return true;
        if (contentType === 'anime')
            return isJapaneseAnimation;
        return m.media_type === contentType;
    }), [baseMovies, contentType]);
    const availableGenres = useMemo(() => [...new Set(typeFilteredMovies.flatMap(m => m.genre_ids))]
        .map(id => ({ id, name: GENRE_MAP[id] }))
        .filter(g => g.name)
        .sort((a, b) => a.name.localeCompare(b.name)), [typeFilteredMovies]);
    const availableProviders = useMemo(() => [...new Map(typeFilteredMovies.flatMap(m => m.providers || []).map(p => [p.provider_id, p])).values()].sort((a, b) => a.provider_name.localeCompare(b.provider_name)), [typeFilteredMovies]);
    const toggleCategory = useCallback((key) => {
        setActiveCategory(key);
        setActiveGenres([]);
        setActiveProviders([]);
        setContentType('movie');
        setCurrentPage(1);
    }, []);
    const toggleGenre = useCallback((id) => {
        setActiveGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
        setCurrentPage(1);
    }, []);
    const toggleProvider = useCallback((id) => {
        setActiveProviders(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
        setCurrentPage(1);
    }, []);
    // Memoized data for horizontal sections — prevent re-render cascade
    const trendingSection = useMemo(() => renderDedup([...trending, ...tvTrending]), [trending, tvTrending]);
    const popularSection = useMemo(() => renderDedup([...popular, ...tvPopular]), [popular, tvPopular]);
    const topRatedSection = useMemo(() => renderDedup([...topRated, ...tvTopRated]), [topRated, tvTopRated]);
    const [filteredMovies, setFilteredMovies] = useState([]);
    useEffect(() => {
        // Removed delay entirely for instant feedback
        const filtered = baseMovies.filter(m => {
            const genreMatch = activeGenres.length === 0 || m.genre_ids?.some(id => activeGenres.includes(id));
            const providerMatch = activeProviders.length === 0 || (m.providers || []).some(p => activeProviders.includes(p.provider_id));
            const isJapaneseAnimation = m.genre_ids?.includes(16) && m.original_language === 'ja';
            // Unified type match
            let typeMatch = false;
            if (contentType === 'all') {
                typeMatch = true;
            }
            else if (contentType === 'anime') {
                typeMatch = isJapaneseAnimation;
            }
            else {
                typeMatch = m.media_type === contentType;
            }
            return genreMatch && providerMatch && typeMatch;
        });
        // Sort by release date descending for "Now Playing" to ensure newest first
        if (activeCategory === 'now_playing') {
            filtered.sort((a, b) => {
                const dateA = new Date(a.release_date || 0).getTime();
                const dateB = new Date(b.release_date || 0).getTime();
                return dateB - dateA;
            });
        }
        // Only update if filtered result changed — prevent re-render cascade
        setFilteredMovies(prev => {
            if (prev.length === filtered.length && prev.every((m, i) => m.id === filtered[i].id)) {
                return prev;
            }
            return filtered;
        });
    }, [baseMovies, activeGenres, activeProviders, contentType, activeCategory]);
    const [featured, ...allRest] = filteredMovies;
    const totalPages = Math.ceil(allRest.length / ITEMS_PER_PAGE);
    const paginatedMovies = allRest.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    // Sliding pagination window — always show 5 pages
    const PAGINATION_WINDOW = 5;
    let pageStart = Math.max(1, currentPage - Math.floor(PAGINATION_WINDOW / 2));
    let pageEnd = Math.min(totalPages, pageStart + PAGINATION_WINDOW - 1);
    if (pageEnd - pageStart < PAGINATION_WINDOW - 1)
        pageStart = Math.max(1, pageEnd - PAGINATION_WINDOW + 1);
    const pageRange = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);
    if (error) {
        return (_jsx("div", { className: "min-h-[100dvh] bg-surface flex items-center justify-center px-6", children: _jsxs("div", { className: "text-center max-w-sm", children: [_jsx("p", { className: "text-5xl mb-4", children: "\uD83C\uDFAC" }), _jsx("p", { className: "text-text-primary text-lg font-semibold mb-2", children: "Something went wrong" }), _jsx("p", { className: "text-text-muted text-sm", children: error }), _jsx("button", { onClick: () => window.location.reload(), className: "mt-6 bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full active:scale-95 transition-transform", children: "Try Again" })] }) }));
    }
    if (loading) {
        return (_jsxs("div", { className: "min-h-[100dvh] bg-surface px-4 sm:px-6 md:px-12 py-6 max-w-[1400px] mx-auto", children: [_jsxs("header", { className: "mb-10", children: [_jsx("div", { className: "skeleton h-8 w-36 rounded mb-2" }), _jsx("div", { className: "skeleton h-3 w-48 rounded" })] }), _jsx(SkeletonHero, {}), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5", children: Array.from({ length: 10 }).map((_, i) => _jsx(SkeletonCard, {}, i)) })] }));
    }
    return (_jsxs("div", { className: "min-h-[100dvh] bg-surface", children: [currentPage === 1 && featured?.backdrop_path ? (_jsx("div", { className: "fixed inset-0 pointer-events-none z-0 opacity-20", style: {
                    background: `radial-gradient(ellipse at 50% 0%, url(${IMG_BASE}/w500${featured.backdrop_path}) 0%, transparent 70%)`,
                } })) : null, _jsxs("div", { className: "relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 py-5 md:py-8", children: [_jsx(Navbar, {}), featured && currentPage === 1 && (_jsx(motion.section, { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }, className: "relative mb-12 md:mb-16 rounded-xl md:rounded-2xl overflow-hidden group", children: _jsxs("div", { className: "relative h-[50vh] sm:h-[60vh] md:h-[75vh]", children: [featured.backdrop_path ? (_jsx("img", { src: `${IMG_BASE}/original${featured.backdrop_path}`, alt: featured.title, className: "w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" })) : (_jsx("div", { className: "w-full h-full bg-surface-card flex items-center justify-center text-zinc-700 text-4xl font-black", children: featured.title })), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-surface/80 to-transparent" }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 p-5 sm:p-8 md:p-12", children: _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: 0.4 }, children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4", children: [_jsx("span", { className: "bg-accent/10 text-accent text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full border border-accent/20", children: "Featured" }), _jsx("span", { className: "text-white/70 text-xs sm:text-sm font-medium", children: featured.release_date?.split('-')[0] }), featured.genre_ids?.slice(0, 2).map(gid => (_jsx("span", { className: "text-white/70 text-xs sm:text-sm font-medium hidden sm:inline", children: GENRE_MAP[gid] }, gid)))] }), _jsx("h2", { className: "text-2xl sm:text-4xl md:text-6xl font-black tracking-tight text-white mb-3 sm:mb-4 leading-[1.1]", children: featured.title }), _jsx("p", { className: "text-white/80 text-sm sm:text-base md:text-lg max-w-2xl mb-5 sm:mb-6 line-clamp-2 sm:line-clamp-3 leading-relaxed", children: featured.overview }), _jsxs("div", { className: "flex items-center gap-3 sm:gap-4", children: [_jsx("button", { onClick: () => openDetail(featured), className: "bg-white text-black text-xs sm:text-sm font-bold px-5 sm:px-8 py-2.5 sm:py-3 rounded-full hover:bg-accent hover:text-black transition-all duration-300 active:scale-95", children: "Details" }), _jsxs("span", { className: "text-accent font-mono font-bold text-base sm:text-lg", children: ["\u2605 ", featured.vote_average?.toFixed(1)] })] })] }) })] }) })), currentPage === 1 && (_jsxs(_Fragment, { children: [_jsx("div", { children: _jsx(HorizontalSection, { title: "Trending", subtitle: "What's hot this week", movies: trendingSection, onMovieClick: openDetail }) }), _jsx("div", { children: _jsx(HorizontalSection, { title: "Popular", subtitle: "Most watched right now", movies: popularSection, onMovieClick: openDetail }) }), _jsx("div", { children: _jsx(HorizontalSection, { title: "Top Rated", subtitle: "Critics' picks", movies: topRatedSection, onMovieClick: openDetail }) })] })), _jsxs(motion.div, { ref: nowPlayingRef, initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.3 }, className: "mb-6 md:mb-8", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg sm:text-xl font-bold text-text-primary", children: CATEGORIES.find(c => c.key === activeCategory)?.label || 'Now Playing' }), _jsxs("p", { className: "text-text-muted text-xs sm:text-sm mt-1", children: [filteredMovies.length, " results"] })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs("button", { onClick: () => setShowGenres(!showGenres), className: "bg-surface-elevated border border-zinc-800 text-text-primary text-xs font-bold px-4 py-2 rounded-full hover:border-accent transition-all active:scale-95 flex items-center gap-2", children: [showGenres ? 'Hide Filters' : 'Filters', (activeGenres.length > 0 || activeProviders.length > 0 || contentType !== 'all') && (_jsx("span", { className: "bg-accent text-black text-[10px] px-1.5 py-0.5 rounded-full", children: [activeGenres.length, activeProviders.length, contentType !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0) }))] }) })] }), _jsx(AnimatePresence, { children: showGenres && (_jsxs(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.3, ease: 'easeInOut' }, className: "overflow-hidden", children: [_jsxs("div", { className: "mt-4 pb-4 border-b border-zinc-800/50", children: [_jsx("p", { className: "text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3", children: "Category" }), _jsx("div", { className: "flex flex-wrap gap-2", children: [
                                                        { key: 'now_playing', label: 'Now Playing' },
                                                        { key: 'trending', label: 'Trending' },
                                                        { key: 'popular', label: 'Popular' },
                                                        { key: 'top_rated', label: 'Top Rated' },
                                                    ].map(c => (_jsx("button", { onClick: () => toggleCategory(c.key), className: `shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${activeCategory === c.key
                                                            ? 'bg-accent text-black'
                                                            : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'}`, children: c.label }, c.key))) })] }), _jsxs("div", { className: "mt-4 pb-4 border-b border-zinc-800/50", children: [_jsx("p", { className: "text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3", children: "Genre" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { onClick: () => setActiveGenres([]), className: `shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${activeGenres.length === 0
                                                                ? 'bg-accent text-black'
                                                                : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'}`, children: "All" }), availableGenres.map(g => (_jsx("button", { onClick: () => toggleGenre(g.id), className: `shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${activeGenres.includes(g.id)
                                                                ? 'bg-accent text-black'
                                                                : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'}`, children: g.name }, g.id)))] })] }), availableProviders.length > 0 && (_jsxs("div", { className: "mt-4 pb-4 border-b border-zinc-800/50", children: [_jsx("p", { className: "text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3", children: "Platform" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { onClick: () => setActiveProviders([]), className: `shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${activeProviders.length === 0
                                                                ? 'bg-accent text-black'
                                                                : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'}`, children: "All" }), availableProviders.map(p => (_jsxs("button", { onClick: () => toggleProvider(p.provider_id), className: `shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full transition-all duration-200 active:scale-95 ${activeProviders.includes(p.provider_id)
                                                                ? 'bg-accent text-black'
                                                                : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'}`, children: [_jsx("img", { src: `${IMG_BASE}/w45${p.logo_path}`, alt: p.provider_name, className: "w-4 h-4 rounded-sm object-cover", loading: "lazy" }), p.provider_name] }, p.provider_id)))] })] })), _jsxs("div", { className: "mt-4 pb-4 border-b border-zinc-800/50", children: [_jsx("p", { className: "text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3", children: "Type" }), _jsx("div", { className: "flex flex-wrap gap-2", children: [
                                                        { key: 'all', label: 'All' },
                                                        { key: 'movie', label: 'Movies' },
                                                        { key: 'tv', label: 'TV Series' },
                                                        { key: 'anime', label: 'Anime' },
                                                    ].map(t => (_jsx("button", { onClick: () => {
                                                            setContentType(t.key);
                                                            setCurrentPage(1);
                                                        }, className: `shrink-0 text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 active:scale-95 ${contentType === t.key
                                                            ? 'bg-accent text-black'
                                                            : 'bg-surface-elevated text-text-muted border border-zinc-800 hover:border-zinc-600'}`, children: t.label }, t.key))) })] })] })) })] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 pb-8", children: paginatedMovies.map((movie, i) => (_jsx(motion.article, { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: {
                                duration: 0.5,
                                delay: Math.min(0.1 + i * 0.03, 0.8),
                                ease: [0.16, 1, 0.3, 1],
                            }, onClick: () => openDetail(movie), className: "cursor-pointer", children: _jsxs("div", { className: "relative overflow-hidden rounded-xl bg-surface-card aspect-[2/3]", children: [movie.poster_path ? (_jsx("img", { src: `${IMG_BASE}/w500${movie.poster_path}`, alt: movie.title, className: "w-full h-full object-cover transition-transform duration-500 hover:scale-105", loading: "lazy" })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center text-zinc-700 text-sm font-bold", children: movie.title?.charAt(0) })), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300", children: _jsx("span", { className: "bg-white text-black text-[10px] font-bold px-4 py-1.5 rounded-full shadow-lg", children: "Details" }) }), _jsxs("div", { className: "absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-accent text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md", children: ["\u2605 ", movie.vote_average?.toFixed(1)] }), movie.genre_ids?.includes(16) && movie.original_language === 'ja' && (_jsx("div", { className: `absolute top-2 left-2 bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md ${movie.media_type === 'tv' ? 'top-8' : ''}`, children: "Anime" })), _jsxs("div", { className: "absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/90 to-transparent", children: [_jsx("p", { className: "text-white font-bold text-[11px] sm:text-xs line-clamp-1 mb-0.5", children: movie.title }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-white/50 text-[9px] sm:text-[10px]", children: formatDate(movie.release_date) }), movie.genre_ids?.[0] && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-white/30 text-[9px]", children: "\u2022" }), _jsx("span", { className: "text-white/50 text-[9px] sm:text-[10px]", children: GENRE_MAP[movie.genre_ids[0]] })] }))] })] })] }) }, `${activeCategory}-${movie.id}`))) }), totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-center gap-2 py-8 pb-12", children: [_jsx("button", { onClick: () => setCurrentPage(p => Math.max(1, p - 1)), disabled: currentPage === 1, className: "px-3 py-2 rounded-lg text-xs font-bold bg-surface-elevated border border-zinc-800 text-text-muted hover:border-accent hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95", children: "\u2190 Prev" }), pageRange.map(page => (_jsx("button", { onClick: () => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }, className: `w-9 h-9 rounded-lg text-xs font-bold transition-all active:scale-95 ${currentPage === page
                                    ? 'bg-accent text-black'
                                    : 'bg-surface-elevated border border-zinc-800 text-text-muted hover:border-zinc-600'}`, children: page }, page))), _jsx("button", { onClick: () => setCurrentPage(p => Math.min(totalPages, p + 1)), disabled: currentPage === totalPages, className: "px-3 py-2 rounded-lg text-xs font-bold bg-surface-elevated border border-zinc-800 text-text-muted hover:border-accent hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95", children: "Next \u2192" })] })), filteredMovies.length === 0 && (_jsxs("div", { className: "text-center py-16", children: [_jsx("p", { className: "text-4xl mb-3", children: "\uD83D\uDD0D" }), _jsx("p", { className: "text-text-primary text-sm font-bold mb-2", children: "No results found" }), _jsx("p", { className: "text-text-muted text-xs mb-6", children: "Try adjusting your filters or explore these suggestions" }), _jsxs("div", { className: "flex flex-wrap justify-center gap-2", children: [contentType === 'anime' && (_jsx("button", { onClick: () => setContentType('all'), className: "text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all", children: "Show All Content" })), contentType !== 'anime' && (_jsx("button", { onClick: () => setContentType('anime'), className: "text-xs font-medium px-4 py-2 rounded-full bg-surface-elevated text-text-muted border border-zinc-800 hover:border-accent hover:text-accent transition-all", children: "Browse Anime" })), _jsx("button", { onClick: () => { setActiveGenres([]); setActiveProviders([]); setContentType('movie'); }, className: "text-xs font-medium px-4 py-2 rounded-full bg-accent text-black hover:bg-accent/90 transition-all", children: "Reset All Filters" })] })] })), _jsx("div", { ref: loadMoreRef, className: "py-8" })] })] }));
}
