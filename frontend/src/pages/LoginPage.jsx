import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SignalIcon } from '@heroicons/react/24/solid';
export default function LoginPage() {
    const { login, isAuthenticated, loading, error } = useAuth();
    const location = useLocation();
    const from = location.state?.from?.pathname ?? '/';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    if (isAuthenticated)
        return _jsx(Navigate, { to: from, replace: true });
    const handleSubmit = async (e) => {
        e.preventDefault();
        login({ email, password });
    };
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-dark-950 px-4", children: _jsxs("div", { className: "w-full max-w-md", children: [_jsxs("div", { className: "mb-8 flex flex-col items-center", children: [_jsx("div", { className: "flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/30", children: _jsx(SignalIcon, { className: "h-7 w-7 text-white" }) }), _jsx("h1", { className: "mt-4 text-2xl font-bold text-white", children: "TrafficOS" }), _jsx("p", { className: "mt-1 text-sm text-dark-400", children: "Autonomous Traffic Light Control System" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "rounded-2xl border border-dark-700 bg-dark-800/60 p-8 shadow-2xl backdrop-blur-sm", children: [_jsx("h2", { className: "text-lg font-semibold text-white", children: "Sign in to your account" }), _jsx("p", { className: "mt-1 text-sm text-dark-400", children: "Enter your credentials to access the dashboard" }), error && (_jsx("div", { className: "mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400", children: error })), _jsxs("div", { className: "mt-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-dark-300", children: "Email address" }), _jsx("input", { id: "email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, autoComplete: "email", className: "mt-1.5 block w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5 text-sm text-white placeholder-dark-500 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500", placeholder: "admin@traffic.io" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-dark-300", children: "Password" }), _jsx("input", { id: "password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, autoComplete: "current-password", className: "mt-1.5 block w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5 text-sm text-white placeholder-dark-500 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] })] }), _jsx("button", { type: "submit", disabled: loading, className: "mt-6 flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50", children: loading ? (_jsx("div", { className: "h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" })) : ('Sign in') })] }), _jsx("p", { className: "mt-6 text-center text-xs text-dark-600", children: "\u00A9 2026 TrafficOS \u2014 Autonomous Traffic Light Control System" })] }) }));
}
