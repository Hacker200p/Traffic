import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, } from 'recharts';
import { violationLabel } from '@/utils/formatters';
const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];
export default function ViolationChart({ data }) {
    const formatted = data.map((d) => ({
        ...d,
        label: violationLabel(d.type) ?? d.type,
    }));
    return (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [_jsx("h3", { className: "mb-4 text-sm font-semibold text-white", children: "Violations by Type" }), _jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(BarChart, { data: formatted, margin: { top: 5, right: 10, left: -20, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#334155" }), _jsx(XAxis, { dataKey: "label", tick: { fill: '#94a3b8', fontSize: 11 } }), _jsx(YAxis, { tick: { fill: '#94a3b8', fontSize: 11 } }), _jsx(Tooltip, { contentStyle: {
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: 12,
                                color: '#f1f5f9',
                                fontSize: 12,
                            } }), _jsx(Bar, { dataKey: "count", radius: [6, 6, 0, 0], children: formatted.map((_, idx) => (_jsx(Cell, { fill: COLORS[idx % COLORS.length] }, idx))) })] }) })] }));
}
