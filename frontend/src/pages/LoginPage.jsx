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

    if (isAuthenticated) {
        return <Navigate to={from} replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        login({ email, password });
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-dark-950">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(180deg,_rgba(2,6,23,0)_0%,_rgba(2,6,23,0.88)_100%)]" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl" />

            <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 lg:flex-row lg:items-center lg:gap-8 lg:px-8">
                <div className="mb-8 flex-1 lg:mb-0 lg:max-w-xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium tracking-wide text-dark-300 backdrop-blur">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" />
                        LIVE TRAFFIC OPERATIONS
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-xl shadow-primary-600/30 ring-1 ring-white/10">
                            <SignalIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">TrafficOS</h1>
                            <p className="mt-2 max-w-md text-sm leading-6 text-dark-300">
                                A professional traffic command center for live monitoring, analytics, and road safety operations.
                            </p>
                        </div>
                    </div>

                    <div className="mt-10 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-dark-900/60 p-4 shadow-lg backdrop-blur">
                            <p className="text-xs uppercase tracking-[0.18em] text-dark-500">Monitoring</p>
                            <p className="mt-2 text-lg font-semibold text-white">Real-time</p>
                            <p className="mt-1 text-sm text-dark-400">Traffic, incidents, and signal states</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-dark-900/60 p-4 shadow-lg backdrop-blur">
                            <p className="text-xs uppercase tracking-[0.18em] text-dark-500">Response</p>
                            <p className="mt-2 text-lg font-semibold text-white">Instant</p>
                            <p className="mt-1 text-sm text-dark-400">Fast access for control-room teams</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-dark-900/60 p-4 shadow-lg backdrop-blur">
                            <p className="text-xs uppercase tracking-[0.18em] text-dark-500">Security</p>
                            <p className="mt-2 text-lg font-semibold text-white">Protected</p>
                            <p className="mt-1 text-sm text-dark-400">Role-based access and audit trails</p>
                        </div>
                    </div>

                    <div className="mt-8 space-y-3 text-sm text-dark-300">
                        <div className="flex items-center gap-3">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary-400" />
                            Live traffic analytics and congestion heatmaps
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                            Incident detection, violations, and alert workflows
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                            Designed for command centers and operations teams
                        </div>
                    </div>
                </div>

                <div className="w-full lg:max-w-xl">
                    <form
                        onSubmit={handleSubmit}
                        className="rounded-[28px] border border-white/10 bg-dark-900/70 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-10"
                    >
                        <div className="mb-8">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-300">Secure access</p>
                            <h2 className="mt-3 text-2xl font-semibold text-white">Sign in to your account</h2>
                            <p className="mt-2 text-sm leading-6 text-dark-400">
                                Use your credentials to enter the dashboard and manage live traffic operations.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label htmlFor="email" className="mb-2 block text-sm font-medium text-dark-200">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="block w-full rounded-xl border border-white/10 bg-dark-800 px-4 py-3 text-sm text-white placeholder-dark-500 outline-none transition duration-200 focus:border-primary-500 focus:bg-dark-700 focus:ring-2 focus:ring-primary-500/20"
                                    placeholder="admin@traffic.io"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="mb-2 block text-sm font-medium text-dark-200">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className="block w-full rounded-xl border border-white/10 bg-dark-800 px-4 py-3 text-sm text-white placeholder-dark-500 outline-none transition duration-200 focus:border-primary-500 focus:bg-dark-700 focus:ring-2 focus:ring-primary-500/20"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-7 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition duration-200 hover:from-primary-400 hover:to-primary-500 hover:shadow-primary-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs leading-5 text-dark-500">
                        © 2026 TrafficOS - Autonomous Traffic Light Control System
                        <br />
                        Developed by TrafficOS Team
                    </p>
                </div>
            </div>
        </div>
    );
}
