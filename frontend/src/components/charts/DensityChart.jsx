import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, } from 'recharts';
import { formatTime } from '@/utils/formatters';
export default function DensityChart({ data, title = 'Density Over Time', color = '#f97316' }) {
    const formatted = data.map((d) => {
        const timestamp = d.timestamp ?? d.time_bucket ?? d.time ?? d.recorded_at ?? d.created_at;
        const value = d.value ?? d.unique_vehicles ?? d.vehicle_count ?? d.vehicleCount ?? d.tracking_points ?? d.point_count ?? 0;
        return {
            ...d,
            time: timestamp ? formatTime(timestamp) : '',
            value: Number(value) || 0,
        };
    });
    if (formatted.length === 0) {
        return (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [_jsx("h3", { className: "mb-4 text-sm font-semibold text-white", children: title }), _jsx("div", { className: "flex h-[280px] items-center justify-center rounded-lg border border-dashed border-dark-700 text-sm text-dark-400", children: "No timeline data available" })] }));
    }
    return (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [_jsx("h3", { className: "mb-4 text-sm font-semibold text-white", children: title }), _jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(LineChart, { data: formatted, margin: { top: 5, right: 10, left: -20, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#334155" }), _jsx(XAxis, { dataKey: "time", tick: { fill: '#94a3b8', fontSize: 11 } }), _jsx(YAxis, { tick: { fill: '#94a3b8', fontSize: 11 } }), _jsx(Tooltip, { contentStyle: {
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: 12,
                                color: '#f1f5f9',
                                fontSize: 12,
                            } }), _jsx(Line, { type: "monotone", dataKey: "value", stroke: color, strokeWidth: 2, dot: false })] }) })] }));
}
