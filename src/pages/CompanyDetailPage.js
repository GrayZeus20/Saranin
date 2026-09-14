import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import Navbar from '../components/Navbar';
const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
export default function CompanyDetailPage() {
    const { id } = useParams();
    const [company, setCompany] = useState(null);
    const [movies, setMovies] = useState([]);
    const [tvShows, setTvShows] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        const controller = new AbortController();
        const fetchCompanyData = async () => {
            try {
                const companyRes = await fetch(`${BASE_URL}/company/${id}?language=en-US`, {
                    headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
                    signal: controller.signal
                });
                if (!companyRes.ok)
                    throw new Error(`${companyRes.status}`);
                const companyData = await companyRes.json();
                const [moviesRes, tvRes] = await Promise.all([
                    fetch(`${BASE_URL}/discover/movie?with_companies=${id}&sort_by=primary_release_date.desc&language=en-US`, {
                        headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
                        signal: controller.signal
                    }),
                    fetch(`${BASE_URL}/discover/tv?with_companies=${id}&sort_by=first_air_date.desc&language=en-US`, {
                        headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
                        signal: controller.signal
                    })
                ]);
                const moviesData = await moviesRes.json();
                const tvData = await tvRes.json();
                setCompany(companyData);
                setMovies((moviesData.results || []).map((m) => ({ ...m, media_type: 'movie', title: m.title })));
                setTvShows((tvData.results || []).map((t) => ({ ...t, media_type: 'tv', title: t.name || t.title })));
            }
            catch (err) {
                if (!controller.signal.aborted)
                    console.error(err);
            }
            finally {
                if (!controller.signal.aborted)
                    setLoading(false);
            }
        };
        fetchCompanyData();
        return () => controller.abort();
    }, [id]);
    if (loading) {
        return (_jsx("div", { className: "fixed inset-0 z-50 bg-surface", children: _jsx("div", { className: "w-full h-full overflow-y-auto", children: _jsxs("div", { className: "max-w-5xl mx-auto px-4 sm:px-6 py-12", children: [_jsxs("div", { className: "flex flex-col md:flex-row gap-8 mb-12", children: [_jsx("div", { className: "skeleton w-40 h-40 rounded-2xl shrink-0 mx-auto md:mx-0" }), _jsxs("div", { className: "flex-1 space-y-4", children: [_jsx("div", { className: "skeleton h-10 w-2/3 rounded" }), _jsx("div", { className: "skeleton h-4 w-1/3 rounded" }), _jsx("div", { className: "skeleton h-20 w-full rounded" })] })] }), _jsx("div", { className: "skeleton h-8 w-48 rounded mb-6" }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4", children: Array.from({ length: 10 }).map((_, i) => (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("div", { className: "skeleton w-full aspect-[2/3] rounded-xl" }), _jsx("div", { className: "skeleton h-4 w-3/4 rounded" })] }, i))) })] }) }) }));
    }
    if (!company) {
        return (_jsx("div", { className: "fixed inset-0 z-50 bg-surface flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-5xl mb-4", children: "\uD83C\uDFE2" }), _jsx("p", { className: "text-text-primary text-lg font-semibold mb-2", children: "Company not found" }), _jsx(Link, { to: "/", className: "mt-4 inline-block bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full", children: "Go Home" })] }) }));
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-surface", children: _jsxs("div", { ref: scrollRef, className: "w-full h-full overflow-y-auto", children: [_jsx(Navbar, {}), _jsxs("div", { className: "max-w-5xl mx-auto px-4 sm:px-6 py-12", children: [_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "flex flex-col md:flex-row gap-8 mb-16 items-center md:items-start", children: [_jsxs("div", { className: "shrink-0 w-32 sm:w-40 h-32 sm:h-40 bg-white rounded-2xl p-4 sm:p-6 flex items-center justify-center shadow-xl border border-zinc-800", children: [company.logo_path ? (_jsx("img", { src: `${IMG_BASE}/w300${company.logo_path}`, alt: company.name, className: "max-w-full max-h-full object-contain", onError: (e) => {
                                                e.currentTarget.style.display = 'none';
                                                const fallback = e.currentTarget.nextElementSibling;
                                                if (fallback)
                                                    fallback.style.display = 'flex';
                                            } })) : null, _jsx("span", { className: `text-black text-3xl font-black ${company.logo_path ? 'hidden' : 'flex'}`, style: company.logo_path ? { display: 'none' } : undefined, children: company.name.charAt(0) })] }), _jsxs("div", { className: "flex-1 text-center md:text-left", children: [_jsx("h1", { className: "text-3xl sm:text-5xl font-black text-text-primary mb-4", children: company.name }), _jsxs("div", { className: "flex flex-wrap justify-center md:justify-start gap-6 text-sm text-text-muted mb-6", children: [company.origin_country && (_jsxs("div", { children: [_jsx("span", { className: "text-[10px] uppercase tracking-widest font-bold block mb-1", children: "Origin" }), _jsx("span", { className: "text-text-primary font-bold text-base", children: company.origin_country })] })), company.headquarters && (_jsxs("div", { children: [_jsx("span", { className: "text-[10px] uppercase tracking-widest font-bold block mb-1", children: "Headquarters" }), _jsx("span", { className: "text-text-primary font-medium", children: company.headquarters })] }))] }), company.description ? (_jsxs("div", { className: "mb-6", children: [_jsx("h3", { className: "text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2", children: "About" }), _jsx("p", { className: "text-text-secondary leading-relaxed max-w-3xl", children: company.description })] })) : (_jsxs("p", { className: "text-text-muted italic mb-6", children: ["No description available for ", company.name, "."] })), company.homepage && (_jsx("a", { href: company.homepage, target: "_blank", rel: "noopener noreferrer", className: "inline-block bg-accent/10 text-accent hover:bg-accent hover:text-black transition-colors font-bold text-sm px-5 py-2 rounded-full", children: "Visit Website" }))] })] }), _jsx("h2", { className: "text-xl font-black text-text-primary mb-8 border-b border-zinc-800 pb-4", children: "Productions" }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6", children: [...movies, ...tvShows].map((item, i) => (_jsx(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, transition: { delay: i * 0.05 }, children: _jsxs(Link, { to: `/${item.media_type}/${item.id}`, className: "group block", children: [_jsxs("div", { className: "relative aspect-[2/3] overflow-hidden rounded-xl bg-surface-card border border-zinc-800 transition-transform duration-300 group-hover:scale-105 group-hover:border-accent/50", children: [item.poster_path ? (_jsx("img", { src: `${IMG_BASE}/w500${item.poster_path}`, alt: item.title, className: "w-full h-full object-cover", loading: "lazy" })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center text-zinc-700 text-sm font-bold", children: item.title.charAt(0) })), _jsxs("div", { className: "absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-accent text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md", children: ["\u2605 ", item.vote_average.toFixed(1)] }), item.media_type === 'tv' && (_jsx("div", { className: "absolute top-2 left-2 bg-accent text-black text-[9px] font-bold px-1.5 py-0.5 rounded-md", children: "TV" }))] }), _jsx("h3", { className: "mt-3 text-text-primary text-sm font-bold line-clamp-1 group-hover:text-accent transition-colors", children: item.title }), _jsx("p", { className: "text-text-muted text-[10px]", children: item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0] })] }) }, item.id))) }), movies.length === 0 && tvShows.length === 0 && (_jsx("p", { className: "text-text-muted text-center py-20 italic", children: "No productions found for this company." }))] })] }) }));
}
