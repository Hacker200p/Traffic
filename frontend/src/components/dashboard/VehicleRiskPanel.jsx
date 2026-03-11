import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchRiskProfile, fetchRiskHistory } from '@/store/slices/vehicleSlice';
import RiskBadge from '@/components/common/RiskBadge';
import { violationLabel } from '@/utils/formatters';

const SEVERITY_COLORS = { low: '#3b82f6', medium: '#eab308', high: '#f97316', critical: '#ef4444' };

export default function VehicleRiskPanel({ vehicleId, onRecalculate }) {
    const dispatch = useAppDispatch();
    const { riskProfile, riskHistory } = useAppSelector((s) => s.vehicles);

    useEffect(() => {
        if (vehicleId) {
            dispatch(fetchRiskProfile(vehicleId));
            dispatch(fetchRiskHistory(vehicleId));
        }
    }, [dispatch, vehicleId]);

    if (!riskProfile) {
        return _jsx("div", { className: "rounded-xl border border-dark-700 bg-dark-800 p-4 text-sm text-dark-500", children: "Loading risk profile…" });
    }

    const f = riskProfile.factors;

    return (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800 p-5 space-y-5", children: [
        /* ── Header ──────────────────────────────────────────────── */
        _jsxs("div", { className: "flex items-center justify-between", children: [
            _jsxs("div", { className: "flex items-center gap-3", children: [
                _jsx("h3", { className: "text-sm font-semibold text-white", children: "Risk Profile" }),
                _jsx(RiskBadge, { score: riskProfile.riskScore, rating: riskProfile.riskRating, size: "lg" }),
            ] }),
            onRecalculate && _jsx("button", {
                onClick: onRecalculate,
                className: "rounded-lg border border-dark-600 px-3 py-1.5 text-xs text-dark-300 hover:text-white hover:border-dark-500 transition-colors",
                children: "Recalculate"
            }),
        ] }),

        /* ── Score Breakdown Bars ────────────────────────────────── */
        _jsxs("div", { className: "space-y-3", children: [
            _jsx(ScoreBar, { label: "Violation Score", value: f.violationScore, max: 45, color: "#ef4444" }),
            _jsx(ScoreBar, { label: "Overspeed Score", value: f.overspeedScore, max: 30, color: "#f97316" }),
            _jsx(ScoreBar, { label: "Pattern Score", value: f.patternScore, max: 25, color: "#eab308" }),
        ] }),

        /* ── Key Stats Grid ──────────────────────────────────────── */
        _jsxs("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-4", children: [
            _jsx(MiniStat, { label: "Total Violations", value: f.totalViolations }),
            _jsx(MiniStat, { label: "Recent (30d)", value: f.recentViolations }),
            _jsx(MiniStat, { label: "Overspeed %", value: `${f.overspeedRatio}%` }),
            _jsx(MiniStat, { label: "Max Speed", value: `${f.maxSpeed} km/h` }),
        ] }),

        /* ── Severity Breakdown ──────────────────────────────────── */
        f.totalViolations > 0 && _jsxs("div", { children: [
            _jsx("p", { className: "mb-2 text-xs font-medium text-dark-400", children: "Violations by Severity" }),
            _jsx("div", { className: "flex gap-2", children:
                ['low', 'medium', 'high', 'critical'].map(sev => {
                    const count = f.severityBreakdown[sev] || 0;
                    if (count === 0) return null;
                    return _jsxs("span", {
                        className: "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        style: { color: SEVERITY_COLORS[sev], backgroundColor: SEVERITY_COLORS[sev] + '15' },
                        children: [
                            _jsx("span", { className: "inline-block h-1.5 w-1.5 rounded-full", style: { backgroundColor: SEVERITY_COLORS[sev] } }),
                            `${count} ${sev}`,
                        ]
                    }, sev);
                })
            }),
        ] }),

        /* ── Top Violation Type ──────────────────────────────────── */
        f.topViolationType && _jsxs("p", { className: "text-xs text-dark-400", children: [
            "Most common violation: ",
            _jsx("span", { className: "font-medium text-dark-300", children: violationLabel(f.topViolationType) ?? f.topViolationType }),
        ] }),

        /* ── Risk History Sparkline ───────────────────────────────── */
        riskHistory.length > 1 && _jsxs("div", { children: [
            _jsx("p", { className: "mb-2 text-xs font-medium text-dark-400", children: "Risk Score History" }),
            _jsx(RiskSparkline, { data: riskHistory }),
        ] }),
    ] }));
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function ScoreBar({ label, value, max, color }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return _jsxs("div", { children: [
        _jsxs("div", { className: "flex justify-between text-xs mb-1", children: [
            _jsx("span", { className: "text-dark-400", children: label }),
            _jsxs("span", { className: "text-dark-300", children: [value.toFixed(1), " / ", max] }),
        ] }),
        _jsx("div", { className: "h-1.5 rounded-full bg-dark-700", children:
            _jsx("div", {
                className: "h-full rounded-full transition-all duration-500",
                style: { width: `${pct}%`, backgroundColor: color }
            })
        }),
    ] });
}

function MiniStat({ label, value }) {
    return _jsxs("div", { className: "rounded-lg border border-dark-700 bg-dark-800/50 p-2.5 text-center", children: [
        _jsx("p", { className: "text-lg font-bold text-white", children: value }),
        _jsx("p", { className: "text-[10px] text-dark-500 uppercase tracking-wider", children: label }),
    ] });
}

function RiskSparkline({ data }) {
    const sorted = [...data].reverse();
    const scores = sorted.map(d => d.risk_score ?? d.riskScore);
    const max = Math.max(...scores, 100);
    const w = 300;
    const h = 40;
    const step = scores.length > 1 ? w / (scores.length - 1) : w;
    const pts = scores.map((s, i) => `${i * step},${h - (s / max) * h}`).join(' ');
    return _jsx("svg", { viewBox: `0 0 ${w} ${h}`, className: "h-10 w-full", preserveAspectRatio: "none", children:
        _jsx("polyline", { points: pts, fill: "none", stroke: "#3b82f6", strokeWidth: "2" })
    });
}
