import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

export default function MonthlyTrendChart({ data }) {
    const formatted = data.map(d => ({
        ...d,
        label: d.month ? format(parseISO(d.month), 'MMM yyyy') : '',
    }));

    return (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [
        _jsx("h3", { className: "mb-4 text-sm font-semibold text-white", children: "Monthly Traffic Trends" }),
        _jsx(ResponsiveContainer, { width: "100%", height: 300, children:
            _jsxs(ComposedChart, { data: formatted, margin: { top: 5, right: 10, left: -20, bottom: 0 }, children: [
                _jsxs("defs", { children: [
                    _jsxs("linearGradient", { id: "vehicleGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [
                        _jsx("stop", { offset: "5%", stopColor: "#3b82f6", stopOpacity: 0.4 }),
                        _jsx("stop", { offset: "95%", stopColor: "#3b82f6", stopOpacity: 0.05 }),
                    ] }),
                ] }),
                _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#334155" }),
                _jsx(XAxis, { dataKey: "label", tick: { fill: '#94a3b8', fontSize: 11 } }),
                _jsx(YAxis, { yAxisId: "left", tick: { fill: '#94a3b8', fontSize: 11 } }),
                _jsx(YAxis, { yAxisId: "right", orientation: "right", tick: { fill: '#94a3b8', fontSize: 11 } }),
                _jsx(Tooltip, { contentStyle: {
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    color: '#f1f5f9',
                    fontSize: 12,
                } }),
                _jsx(Legend, { wrapperStyle: { fontSize: 12, color: '#94a3b8' } }),
                _jsx(Bar, { yAxisId: "left", dataKey: "vehicleCount", name: "Vehicles", fill: "url(#vehicleGrad)", stroke: "#3b82f6", radius: [4, 4, 0, 0] }),
                _jsx(Bar, { yAxisId: "left", dataKey: "violationCount", name: "Violations", fill: "#ef4444", fillOpacity: 0.6, radius: [4, 4, 0, 0] }),
                _jsx(Line, { yAxisId: "right", type: "monotone", dataKey: "avgSpeed", name: "Avg Speed (km/h)", stroke: "#22c55e", strokeWidth: 2, dot: { r: 3 } }),
                _jsx(Line, { yAxisId: "left", type: "monotone", dataKey: "accidentCount", name: "Accidents", stroke: "#f97316", strokeWidth: 2, strokeDasharray: "5 5", dot: { r: 3 } }),
            ] })
        }),
    ] }));
}
