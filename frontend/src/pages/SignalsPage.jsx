import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSignals } from '@/store/slices/signalSlice';
import { signalsApi } from '@/api/signals.api';
import { SIGNAL_COLORS } from '@/utils/constants';
import { signalLabel, timeAgo } from '@/utils/formatters';
import RoleGate from '@/components/auth/RoleGate';
import toast from 'react-hot-toast';
import clsx from 'clsx';
export default function SignalsPage() {
    const dispatch = useAppDispatch();
    const { items, loading } = useAppSelector((s) => s.signals);
    useEffect(() => {
        dispatch(fetchSignals());
    }, [dispatch]);
    const handleMode = async (id, mode) => {
        try {
            await signalsApi.setMode(id, mode);
            toast.success(`Signal set to ${mode}`);
            dispatch(fetchSignals());
        }
        catch {
            toast.error('Failed to update signal mode');
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-dark-600 border-t-primary-500" }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: "Traffic Signals" }), _jsxs("p", { className: "mt-1 text-sm text-dark-400", children: [items.filter((s) => s.isOnline).length, " of ", items.length, " signals online"] })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: items.map((sig) => (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5 transition-colors hover:border-dark-600", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "h-4 w-4 rounded-full shadow-lg", style: {
                                                backgroundColor: SIGNAL_COLORS[sig.currentState],
                                                boxShadow: `0 0 12px ${SIGNAL_COLORS[sig.currentState]}60`,
                                            } }), _jsx("h3", { className: "text-sm font-semibold text-white", children: sig.name })] }), _jsx("span", { className: clsx('rounded-full px-2 py-0.5 text-[10px] font-semibold', sig.isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'), children: sig.isOnline ? 'Online' : 'Offline' })] }), _jsxs("div", { className: "mt-3 space-y-1 text-xs text-dark-400", children: [_jsxs("p", { children: ["State: ", _jsx("span", { className: "font-medium text-dark-200", children: signalLabel(sig.currentState) })] }), sig.remainingSeconds != null && (_jsxs("p", { children: ["Remaining: ", _jsxs("span", { className: "font-mono text-dark-200", children: [sig.remainingSeconds, "s"] })] })), _jsxs("p", { children: ["Mode: ", _jsx("span", { className: "font-medium text-dark-200 capitalize", children: sig.isAutonomous ? 'auto' : 'manual' })] }), sig.intersectionName && _jsxs("p", { children: ["Intersection: ", sig.intersectionName] }), _jsxs("p", { children: ["Updated: ", timeAgo(sig.lastStateChange || sig.updatedAt)] })] }), _jsx(RoleGate, { roles: ['admin'], children: _jsx("div", { className: "mt-4 flex gap-1", children: ['auto', 'manual', 'emergency'].map((mode) => (_jsx("button", { onClick: () => handleMode(sig.id, mode), className: clsx('rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors', (mode === 'auto' ? sig.isAutonomous : false)
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600 hover:text-white'), children: mode }, mode))) }) })] }, sig.id))) })] }));
}
