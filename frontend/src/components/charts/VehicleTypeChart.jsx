import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#f97316'];
export default function VehicleTypeChart({ data, title = 'Vehicles by Type' }) {
    return (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [_jsx("h3", { className: "mb-4 text-sm font-semibold text-white", children: title }), _jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: data, cx: "50%", cy: "50%", innerRadius: 55, outerRadius: 90, paddingAngle: 4, dataKey: "value", children: data.map((_, idx) => (_jsx(Cell, { fill: COLORS[idx % COLORS.length] }, idx))) }), _jsx(Tooltip, { contentStyle: {
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: 12,
                                color: '#f1f5f9',
                                fontSize: 12,
                            } }), _jsx(Legend, { wrapperStyle: { fontSize: 12, color: '#94a3b8' }, formatter: (value) => _jsx("span", { className: "text-dark-300", children: value }) })] }) })] }));
}
