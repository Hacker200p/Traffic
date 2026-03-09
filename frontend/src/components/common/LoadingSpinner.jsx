import { jsx as _jsx } from "react/jsx-runtime";
export default function LoadingSpinner({ className = '' }) {
    return (_jsx("div", { className: `flex items-center justify-center ${className}`, children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-dark-600 border-t-primary-500" }) }));
}
