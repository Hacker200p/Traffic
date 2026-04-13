import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, } from 'recharts';
export default function TrafficFlowChart({ data }) {
    const formatted = data.map((d) => ({
        ...d,
        period: d.period ?? d.time_bucket ?? d.timestamp ?? d.recorded_at ?? d.created_at ?? '',
        vehicleCount: Number(d.vehicleCount ?? d.vehicle_count ?? d.point_count ?? d.tracking_points ?? 0),
        avgSpeed: Number(d.avgSpeed ?? d.avg_speed ?? 0),
    }));
    if (formatted.length === 0) {
        return (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [_jsx("h3", { className: "mb-4 text-sm font-semibold text-white", children: "Traffic Flow" }), _jsx("div", { className: "flex h-[280px] items-center justify-center rounded-lg border border-dashed border-dark-700 text-sm text-dark-400", children: "No traffic flow data available" })] }));
    }
    return (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [_jsx("h3", { className: "mb-4 text-sm font-semibold text-white", children: "Traffic Flow" }), _jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(AreaChart, { data: formatted, margin: { top: 5, right: 10, left: -20, bottom: 0 }, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "flowGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#3b82f6", stopOpacity: 0.3 }), _jsx("stop", { offset: "95%", stopColor: "#3b82f6", stopOpacity: 0 })] }), _jsxs("linearGradient", { id: "speedGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#22c55e", stopOpacity: 0.3 }), _jsx("stop", { offset: "95%", stopColor: "#22c55e", stopOpacity: 0 })] })] }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#334155" }), _jsx(XAxis, { dataKey: "period", tick: { fill: '#94a3b8', fontSize: 11 } }), _jsx(YAxis, { tick: { fill: '#94a3b8', fontSize: 11 } }), _jsx(Tooltip, { contentStyle: {
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: 12,
                                color: '#f1f5f9',
                                fontSize: 12,
                            } }), _jsx(Legend, { wrapperStyle: { fontSize: 12, color: '#94a3b8' } }), _jsx(Area, { type: "monotone", dataKey: "vehicleCount", name: "Vehicles", stroke: "#3b82f6", fill: "url(#flowGrad)", strokeWidth: 2 }), _jsx(Area, { type: "monotone", dataKey: "avgSpeed", name: "Avg Speed (km/h)", stroke: "#22c55e", fill: "url(#speedGrad)", strokeWidth: 2 })] }) })] }));
}
