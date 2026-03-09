import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useAppSelector } from '@/store/hooks';
import { SIGNAL_COLORS } from '@/utils/constants';
import clsx from 'clsx';
export default function SignalStatusPanel() {
    const signals = useAppSelector((s) => s.signals.items);
    const online = signals.filter((s) => s.isOnline);
    return (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [_jsxs("h3", { className: "mb-3 text-sm font-semibold text-white", children: ["Traffic Signals", ' ', _jsxs("span", { className: "text-dark-500", children: ["(", online.length, "/", signals.length, " online)"] })] }), signals.length === 0 ? (_jsx("p", { className: "py-6 text-center text-xs text-dark-500", children: "No signals loaded" })) : (_jsx("ul", { className: "max-h-[380px] space-y-1.5 overflow-y-auto pr-1", children: signals.slice(0, 12).map((sig) => (_jsxs("li", { className: "flex items-center justify-between rounded-lg bg-dark-700/30 px-3 py-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "h-3 w-3 rounded-full", style: { backgroundColor: SIGNAL_COLORS[sig.currentState] } }), _jsx("span", { className: "text-sm text-dark-200", children: sig.name })] }), _jsxs("div", { className: "flex items-center gap-2", children: [sig.remainingSeconds != null && (_jsxs("span", { className: "font-mono text-xs text-dark-400", children: [sig.remainingSeconds, "s"] })), _jsx("span", { className: clsx('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', sig.isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'), children: sig.isOnline ? 'ON' : 'OFF' })] })] }, sig.id))) }))] }));
}
