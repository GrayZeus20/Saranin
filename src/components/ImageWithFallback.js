import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function ImageWithFallback({ src, alt, className, fallbackText }) {
    const [error, setError] = useState(false);
    const [loaded, setLoaded] = useState(false);
    if (error || !src) {
        return (_jsx("div", { className: `flex items-center justify-center bg-zinc-800 text-zinc-600 ${className}`, children: _jsx("span", { className: "text-2xl font-bold", children: fallbackText || alt.charAt(0) }) }));
    }
    return (_jsxs(_Fragment, { children: [!loaded && _jsx("div", { className: `absolute inset-0 skeleton rounded-xl` }), _jsx("img", { src: src, alt: alt, className: `${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`, onLoad: () => setLoaded(true), onError: () => setError(true), loading: "lazy" })] }));
}
