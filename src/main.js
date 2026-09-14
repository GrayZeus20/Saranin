import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';
// Lazy load non-critical pages for code splitting
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage'));
const PersonDetailPage = lazy(() => import('./pages/PersonDetailPage'));
const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
// Loading fallback for lazy routes
function PageLoader() {
    return (_jsx("div", { className: "min-h-[100dvh] bg-surface flex items-center justify-center", children: _jsxs("div", { className: "flex flex-col items-center gap-3", children: [_jsx("div", { className: "w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" }), _jsx("p", { className: "text-text-muted text-xs", children: "Loading..." })] }) }));
}
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
            retryDelay: 500,
        },
    },
});
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(ErrorBoundary, { children: _jsxs(QueryClientProvider, { client: queryClient, children: [_jsx(BrowserRouter, { children: _jsx(Suspense, { fallback: _jsx(PageLoader, {}), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(App, {}) }), _jsx(Route, { path: "/movie/:id", element: _jsx(MovieDetailPage, {}) }), _jsx(Route, { path: "/tv/:id", element: _jsx(MovieDetailPage, {}) }), _jsx(Route, { path: "/person/:id", element: _jsx(PersonDetailPage, {}) }), _jsx(Route, { path: "/company/:id", element: _jsx(CompanyDetailPage, {}) }), _jsx(Route, { path: "/category/:type", element: _jsx(CategoryPage, {}) }), _jsx(Route, { path: "*", element: _jsx(App, {}) })] }) }) }), _jsx(Toaster, { position: "bottom-right", theme: "dark" })] }) }) }));
