import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { violationLabel, severityLabel } from '@/utils/formatters';
import { SEVERITY_COLORS } from '@/utils/constants';

export default function ViolationStatsPanel({ data }) {
    const { byType, bySeverity, totalCount } = useMemo(() => {
        const typeMap = {};
        const sevMap = {};
        let total = 0;
        for (const row of data) {
            const c = parseInt(row.count, 10);
            total += c;
            typeMap[row.type] = (typeMap[row.type] || 0) + c;
            sevMap[row.severity] = (sevMap[row.severity] || 0) + c;
        }
        const byType = Object.entries(typeMap)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);
        const bySeverity = Object.entries(sevMap)
            .map(([severity, count]) => ({ severity, count }))
            .sort((a, b) => b.count - a.count);
        return { byType, bySeverity, totalCount: total };
    }, [data]);

    return (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [
        _jsxs("div", { className: "mb-4 flex items-center justify-between", children: [
            _jsx("h3", { className: "text-sm font-semibold text-white", children: "Violation Breakdown" }),
            _jsxs("span", { className: "text-xs text-dark-400", children: [totalCount, " total"] }),
        ] }),
        _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
            _jsxs("div", { children: [
                _jsx("p", { className: "mb-2 text-xs font-medium text-dark-400", children: "By Type" }),
                _jsx("div", { className: "space-y-2", children: byType.map(({ type, count }) => {
                    const pct = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0;
                    return _jsxs("div", { children: [
                        _jsxs("div", { className: "flex justify-between text-xs", children: [
                            _jsx("span", { className: "text-dark-300", children: violationLabel(type) ?? type }),
                            _jsxs("span", { className: "text-dark-400", children: [count, " (", pct, "%)"] }),
                        ] }),
                        _jsx("div", { className: "mt-1 h-1.5 rounded-full bg-dark-700", children:
                            _jsx("div", { className: "h-full rounded-full bg-primary-500 transition-all", style: { width: `${pct}%` } })
                        }),
                    ] }, type);
                }) }),
            ] }),
            _jsxs("div", { children: [
                _jsx("p", { className: "mb-2 text-xs font-medium text-dark-400", children: "By Severity" }),
                _jsx("div", { className: "space-y-2", children: bySeverity.map(({ severity, count }) => {
                    const pct = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0;
                    const color = SEVERITY_COLORS[severity] ?? '#6b7280';
                    return _jsxs("div", { children: [
                        _jsxs("div", { className: "flex justify-between text-xs", children: [
                            _jsxs("span", { className: "flex items-center gap-1.5 text-dark-300", children: [
                                _jsx("span", { className: "inline-block h-2 w-2 rounded-full", style: { backgroundColor: color } }),
                                severityLabel(severity) ?? severity,
                            ] }),
                            _jsxs("span", { className: "text-dark-400", children: [count, " (", pct, "%)"] }),
                        ] }),
                        _jsx("div", { className: "mt-1 h-1.5 rounded-full bg-dark-700", children:
                            _jsx("div", { className: "h-full rounded-full transition-all", style: { width: `${pct}%`, backgroundColor: color } })
                        }),
                    ] }, severity);
                }) }),
            ] }),
        ] }),
    ] }));
}
