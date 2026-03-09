import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
const styles = {
    success: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
    danger: 'bg-red-500/10 text-red-400 ring-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
    neutral: 'bg-dark-700 text-dark-300 ring-dark-600',
};
export default function StatusBadge({ label, variant = 'neutral', dot }) {
    return (_jsxs("span", { className: clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', styles[variant]), children: [dot && (_jsx("span", { className: clsx('h-1.5 w-1.5 rounded-full', {
                    'bg-emerald-400': variant === 'success',
                    'bg-yellow-400': variant === 'warning',
                    'bg-red-400': variant === 'danger',
                    'bg-blue-400': variant === 'info',
                    'bg-dark-400': variant === 'neutral',
                }) })), label] }));
}
