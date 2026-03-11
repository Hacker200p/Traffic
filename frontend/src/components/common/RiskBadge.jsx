import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';

const RATING_STYLES = {
    low:      'bg-blue-500/10 text-blue-400 ring-blue-500/20',
    medium:   'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
    high:     'bg-orange-500/10 text-orange-400 ring-orange-500/20',
    critical: 'bg-red-500/10 text-red-400 ring-red-500/20',
};

export default function RiskBadge({ score, rating, size = 'sm' }) {
    const r = rating || (score >= 76 ? 'critical' : score >= 51 ? 'high' : score >= 26 ? 'medium' : 'low');
    const styles = RATING_STYLES[r] ?? RATING_STYLES.low;

    if (size === 'lg') {
        return (_jsxs("div", { className: clsx('inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-bold ring-1', styles), children: [
            _jsx("span", { children: Math.round(score) }),
            _jsx("span", { className: "text-xs font-medium capitalize opacity-80", children: r }),
        ] }));
    }

    return (_jsx("span", {
        className: clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', styles),
        title: `Risk: ${Math.round(score)} (${r})`,
        children: Math.round(score),
    }));
}
