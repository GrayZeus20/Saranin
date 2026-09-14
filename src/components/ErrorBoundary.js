import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (_jsx("div", { className: "min-h-[100dvh] bg-surface flex items-center justify-center px-6", children: _jsxs("div", { className: "text-center max-w-sm", children: [_jsx("p", { className: "text-5xl mb-4", children: "\uD83D\uDCA5" }), _jsx("p", { className: "text-text-primary text-lg font-semibold mb-2", children: "Something went wrong" }), _jsx("p", { className: "text-text-muted text-sm mb-4", children: this.state.error?.message || 'Unexpected error' }), _jsx("button", { onClick: () => { this.setState({ hasError: false, error: null }); window.location.reload(); }, className: "bg-accent text-black text-sm font-bold px-6 py-2.5 rounded-full active:scale-95 transition-transform", children: "Try Again" })] }) }));
        }
        return this.props.children;
    }
}
