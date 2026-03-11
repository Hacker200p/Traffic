import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Tooltip, ResponsiveContainer } from 'recharts';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function intensityColor(value, max) {
    if (!max || !value) return 'rgba(59,130,246,0.05)';
    const ratio = value / max;
    if (ratio >= 0.75) return 'rgba(239,68,68,0.8)';
    if (ratio >= 0.5) return 'rgba(249,115,22,0.7)';
    if (ratio >= 0.25) return 'rgba(234,179,8,0.5)';
    return 'rgba(59,130,246,0.15)';
}

export default function PeakHoursChart({ data }) {
    const { grid, maxVal, peakSlots } = useMemo(() => {
        const g = {};
        let mv = 0;
        for (const d of data) {
            const key = `${d.dayOfWeek}-${d.hour}`;
            g[key] = d.vehicleCount;
            if (d.vehicleCount > mv) mv = d.vehicleCount;
        }
        // top-5 peak slots
        const sorted = [...data].sort((a, b) => b.vehicleCount - a.vehicleCount);
        const ps = new Set(sorted.slice(0, 5).map(d => `${d.dayOfWeek}-${d.hour}`));
        return { grid: g, maxVal: mv, peakSlots: ps };
    }, [data]);

    return (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [
        _jsxs("div", { className: "mb-4 flex items-center justify-between", children: [
            _jsx("h3", { className: "text-sm font-semibold text-white", children: "Peak Traffic Hours" }),
            _jsxs("div", { className: "flex gap-3 text-[10px] text-dark-400", children: [
                _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "inline-block h-2.5 w-2.5 rounded-sm", style: { background: 'rgba(59,130,246,0.15)' } }), "Low"] }),
                _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "inline-block h-2.5 w-2.5 rounded-sm", style: { background: 'rgba(234,179,8,0.5)' } }), "Medium"] }),
                _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "inline-block h-2.5 w-2.5 rounded-sm", style: { background: 'rgba(249,115,22,0.7)' } }), "High"] }),
                _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "inline-block h-2.5 w-2.5 rounded-sm", style: { background: 'rgba(239,68,68,0.8)' } }), "Peak"] }),
            ] }),
        ] }),
        _jsx("div", { className: "overflow-x-auto", children:
            _jsxs("table", { className: "w-full border-collapse text-[11px]", children: [
                _jsx("thead", { children: _jsxs("tr", { children: [
                    _jsx("th", { className: "px-1 py-1 text-left text-dark-400 font-normal", children: "" }),
                    ...HOURS.map(h => _jsx("th", { className: "px-0 py-1 text-center text-dark-500 font-normal", children: `${h}` }, h))
                ] }) }),
                _jsx("tbody", { children: DAY_LABELS.map((day, di) => (
                    _jsxs("tr", { children: [
                        _jsx("td", { className: "pr-2 py-0.5 text-dark-400 font-medium whitespace-nowrap", children: day }),
                        ...HOURS.map(h => {
                            const key = `${di}-${h}`;
                            const val = grid[key] || 0;
                            const isPeak = peakSlots.has(key);
                            return _jsx("td", { className: "p-0.5", title: `${day} ${h}:00 — ${val} vehicles`, children:
                                _jsx("div", { className: `h-5 w-full min-w-[18px] rounded-sm transition-colors ${isPeak ? 'ring-1 ring-white/40' : ''}`, style: { backgroundColor: intensityColor(val, maxVal) } })
                            }, h);
                        })
                    ] }, di)
                )) }),
            ] })
        }),
        peakSlots.size > 0 && _jsxs("p", { className: "mt-3 text-xs text-dark-400", children: [
            "🔥 Top peak slots highlighted with border"
        ] }),
    ] }));
}
