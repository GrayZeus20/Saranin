import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import Navbar from '../components/Navbar';
const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
function formatDate(dateStr) {
    if (!dateStr)
        return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function getAge(birthday, deathday) {
    const birth = new Date(birthday);
    const end = deathday ? new Date(deathday) : new Date();
    const age = end.getFullYear() - birth.getFullYear();
    const m = end.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < birth.getDate()))
        return age - 1;
    return age;
}
export default function PersonDetailPage() {
    const { id } = useParams();
    const [person, setPerson] = useState(null);
    const [credits, setCredits] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('cast');
    const scrollRef = useRef(null);
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        const controller = new AbortController();
        Promise.all([
            fetch(`${BASE_URL}/person/${id}?language=en-US`, {
                headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
                signal: controller.signal
            }).then(r => { if (!r.ok)
                throw new Error(`${r.status}`); return r.json(); }),
            fetch(`${BASE_URL}/person/${id}/combined_credits?language=en-US`, {
                headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
                signal: controller.signal
            }).then(r => { if (!r.ok)
                throw new Error(`${r.status}`); return r.json(); }),
        ]).then(([personData, creditsData]) => {
            // Normalize TV credits: name→title, first_air_date→release_date
            const normalize = (arr) => arr.map(c => ({
                ...c,
                title: c.title || c.name || '',
                release_date: c.release_date || c.first_air_date || '',
            }));
            setPerson(personData);
            setCredits({
                cast: normalize(creditsData.cast || []),
                crew: normalize(creditsData.crew || []),
            });
            setLoading(false);
        }).catch(() => {
            if (!controller.signal.aborted) {
                setPerson(null);
                setCredits(null);
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [id]);
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);
    const sortedCast = credits?.cast
        ?.filter(c => c.title)
        .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || '')) || [];
    const sortedCrew = credits?.crew
        ?.filter(c => c.title)
        .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || '')) || [];
    if (loading) {
        return (_jsx("div", { className: "fixed inset-0 z-50 bg-surface", children: _jsx("div", { className: "w-full h-full overflow-y-auto", children: _jsx("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12", children: _jsxs("div", { className: "flex flex-col sm:flex-row gap-8", children: [_jsx("div", { className: "skeleton w-48 h-64 rounded-xl shrink-0" }), _jsxs("div", { className: "flex-1 space-y-4", children: [_jsx("div", { className: "skeleton h-10 w-3/4 rounded" }), _jsx("div", { className: "skeleton h-4 w-1/2 rounded" }), _jsx("div", { className: "skeleton h-24 w-full rounded" })] })] }) }) }) }));
    }
    if (!person) {
        return (_jsx("div", { className: "fixed inset-0 z-50 bg-surface flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-5xl mb-4", children: "\uD83D\uDC64" }), _jsx("p", { className: "text-text-primary text-lg font-semibold mb-2", children: "Person not found" }), _jsx(Link, { to: "/", className: "mt-4 inline-block bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full active:scale-95 transition-transform", children: "Go Home" })] }) }));
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-surface", children: _jsxs("div", { ref: scrollRef, className: "w-full h-full overflow-y-auto", children: [_jsx(Navbar, {}), _jsxs("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12", children: [_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, className: "flex flex-col sm:flex-row gap-6 sm:gap-8 mb-10", children: [_jsx("div", { className: "shrink-0 w-40 sm:w-48 mx-auto sm:mx-0", children: person.profile_path ? (_jsx("img", { src: `${IMG_BASE}/w500${person.profile_path}`, alt: person.name, className: "w-full aspect-[2/3] object-cover rounded-xl shadow-2xl border border-zinc-800" })) : (_jsx("div", { className: "w-full aspect-[2/3] bg-surface-card rounded-xl flex items-center justify-center text-zinc-700 text-4xl font-black border border-zinc-800", children: person.name.charAt(0) })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h1", { className: "text-2xl sm:text-3xl md:text-4xl font-black text-text-primary leading-tight mb-2", children: person.name }), person.also_known_as.length > 0 && (_jsxs("p", { className: "text-text-muted text-xs mb-3", children: ["Also known as: ", person.also_known_as.slice(0, 3).join(', ')] })), _jsxs("div", { className: "flex flex-wrap gap-3 text-sm text-text-muted mb-4", children: [person.birthday && (_jsxs("div", { children: [_jsx("span", { className: "text-[10px] uppercase tracking-widest font-bold text-text-muted block", children: "Born" }), _jsx("span", { className: "text-text-primary", children: formatDate(person.birthday) }), person.deathday ? (_jsxs("span", { className: "text-text-muted", children: [" \u2014 Died ", formatDate(person.deathday), " (age ", getAge(person.birthday, person.deathday), ")"] })) : (_jsxs("span", { className: "text-text-muted", children: [" (age ", getAge(person.birthday), ")"] }))] })), person.place_of_birth && (_jsxs("div", { children: [_jsx("span", { className: "text-[10px] uppercase tracking-widest font-bold text-text-muted block", children: "Place of Birth" }), _jsx("span", { className: "text-text-primary", children: person.place_of_birth })] })), _jsxs("div", { children: [_jsx("span", { className: "text-[10px] uppercase tracking-widest font-bold text-text-muted block", children: "Known For" }), _jsx("span", { className: "text-text-primary", children: person.known_for_department })] })] }), person.biography && (_jsxs("div", { children: [_jsx("h3", { className: "text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2", children: "Biography" }), _jsx("p", { className: "text-text-secondary text-sm leading-relaxed", children: person.biography })] }))] })] }), _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.2 }, children: [_jsxs("div", { className: "flex items-center gap-4 mb-6", children: [_jsx("h2", { className: "text-lg font-bold text-text-primary", children: "Filmography" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: () => setActiveTab('cast'), className: `text-xs font-bold px-4 py-1.5 rounded-full transition-all ${activeTab === 'cast' ? 'bg-accent text-black' : 'bg-surface-elevated border border-zinc-800 text-text-muted hover:border-zinc-600'}`, children: ["Acting (", sortedCast.length, ")"] }), sortedCrew.length > 0 && (_jsxs("button", { onClick: () => setActiveTab('crew'), className: `text-xs font-bold px-4 py-1.5 rounded-full transition-all ${activeTab === 'crew' ? 'bg-accent text-black' : 'bg-surface-elevated border border-zinc-800 text-text-muted hover:border-zinc-600'}`, children: ["Crew (", sortedCrew.length, ")"] }))] })] }), activeTab === 'cast' ? (_jsxs("div", { className: "space-y-3", children: [sortedCast.map((credit, i) => (_jsx(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.3, delay: Math.min(i * 0.03, 0.5) }, children: _jsxs(Link, { to: `/${credit.media_type || 'movie'}/${credit.id}`, className: "flex gap-4 p-3 rounded-xl bg-surface-elevated border border-zinc-800/50 hover:border-zinc-600 transition-all group", children: [_jsx("div", { className: "shrink-0 w-12 h-16 rounded-lg overflow-hidden bg-surface-card", children: credit.poster_path ? (_jsx("img", { src: `${IMG_BASE}/w92${credit.poster_path}`, alt: credit.title, className: "w-full h-full object-cover", loading: "lazy" })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center text-zinc-700 text-xs font-bold", children: credit.media_type === 'tv' ? '📺' : '🎬' })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-text-primary text-sm font-bold line-clamp-1 group-hover:text-accent transition-colors", children: credit.title }), _jsxs("p", { className: "text-text-muted text-xs", children: ["as ", _jsx("span", { className: "text-text-secondary font-medium", children: credit.character || 'N/A' })] }), credit.release_date && (_jsx("p", { className: "text-text-muted text-[10px] mt-0.5", children: credit.release_date.split('-')[0] }))] }), _jsx("div", { className: "shrink-0 flex items-center", children: credit.vote_average > 0 && (_jsxs("span", { className: "text-accent text-[10px] font-mono font-bold", children: ["\u2605 ", credit.vote_average.toFixed(1)] })) })] }) }, `${credit.id}-${credit.character}`))), sortedCast.length === 0 && (_jsx("p", { className: "text-text-muted text-sm text-center py-8", children: "No acting credits found" }))] })) : (_jsxs("div", { className: "space-y-3", children: [sortedCrew.map((credit, i) => (_jsx(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.3, delay: Math.min(i * 0.03, 0.5) }, children: _jsxs(Link, { to: `/${credit.media_type || 'movie'}/${credit.id}`, className: "flex gap-4 p-3 rounded-xl bg-surface-elevated border border-zinc-800/50 hover:border-zinc-600 transition-all group", children: [_jsx("div", { className: "shrink-0 w-12 h-16 rounded-lg overflow-hidden bg-surface-card", children: credit.poster_path ? (_jsx("img", { src: `${IMG_BASE}/w92${credit.poster_path}`, alt: credit.title, className: "w-full h-full object-cover", loading: "lazy" })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center text-zinc-700 text-xs font-bold", children: credit.media_type === 'tv' ? '📺' : '🎬' })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-text-primary text-sm font-bold line-clamp-1 group-hover:text-accent transition-colors", children: credit.title }), _jsxs("p", { className: "text-text-muted text-xs", children: [_jsx("span", { className: "text-accent font-medium", children: credit.job }), credit.department && credit.department !== 'Directing' && credit.department !== 'Writing' && (_jsxs("span", { className: "text-text-muted", children: [" \u2014 ", credit.department] }))] }), credit.release_date && (_jsx("p", { className: "text-text-muted text-[10px] mt-0.5", children: credit.release_date.split('-')[0] }))] }), _jsx("div", { className: "shrink-0 flex items-center", children: credit.vote_average > 0 && (_jsxs("span", { className: "text-accent text-[10px] font-mono font-bold", children: ["\u2605 ", credit.vote_average.toFixed(1)] })) })] }) }, `${credit.id}-${credit.job}`))), sortedCrew.length === 0 && (_jsx("p", { className: "text-text-muted text-sm text-center py-8", children: "No crew credits found" }))] }))] })] })] }) }));
}
