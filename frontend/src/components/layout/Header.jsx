import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { BellIcon, ArrowRightOnRectangleIcon, UserCircleIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchAlerts, markAlertRead } from '@/store/slices/alertSlice';
import { timeAgo } from '@/utils/formatters';
import clsx from 'clsx';
export default function Header() {
    const { user, logout } = useAuth();
    const dispatch = useAppDispatch();
    const unreadCount = useAppSelector((s) => s.alerts.unreadCount);
    const alerts = useAppSelector((s) => s.alerts.items);
    const [menuOpen, setMenuOpen] = useState(false);
    const [bellOpen, setBellOpen] = useState(false);
    const bellRef = useRef(null);

    // Close bell dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Fetch alerts when bell opens
    useEffect(() => {
        if (bellOpen) dispatch(fetchAlerts({ page: 1, limit: 10, activeOnly: true }));
    }, [bellOpen, dispatch]);

    const priorityColor = (p) => {
        if (p === 'critical') return 'bg-red-500';
        if (p === 'high') return 'bg-orange-500';
        if (p === 'medium') return 'bg-yellow-500';
        return 'bg-blue-500';
    };

    const typeIcon = (type) => {
        const map = {
            blacklisted_vehicle: '🚨', emergency: '🚑', violation: '⚠️',
            restricted_zone: '🚧', accident: '💥', congestion: '🚗',
            signal_malfunction: '🚦', weather: '🌧️', road_closure: '🚧',
        };
        return map[type] || '🔔';
    };

    const recentAlerts = alerts.slice(0, 8);

    return (_jsxs("header", { className: "sticky top-0 z-30 flex h-16 items-center justify-between border-b border-dark-700 bg-dark-900/80 px-6 backdrop-blur-sm", children: [_jsx("div", { id: "header-left" }), _jsxs("div", { className: "flex items-center gap-4", children: [
        _jsxs("div", { className: "relative", ref: bellRef, children: [
            _jsxs("button", { onClick: () => setBellOpen(!bellOpen), className: "relative rounded-lg p-2 text-dark-300 hover:bg-dark-800 hover:text-white", children: [_jsx(BellIcon, { className: "h-5 w-5" }), unreadCount > 0 && (_jsx("span", { className: "absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white", children: unreadCount > 99 ? '99+' : unreadCount }))] }),
            bellOpen && (_jsxs("div", { className: "absolute right-0 mt-2 w-80 animate-fade-in rounded-xl border border-dark-700 bg-dark-800 shadow-xl z-50", children: [
                _jsxs("div", { className: "flex items-center justify-between border-b border-dark-700 px-4 py-3", children: [
                    _jsx("h3", { className: "text-sm font-semibold text-white", children: "Notifications" }),
                    unreadCount > 0 && _jsxs("span", { className: "rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400", children: [unreadCount, " new"] }),
                ] }),
                _jsx("div", { className: "max-h-[400px] overflow-y-auto", children: recentAlerts.length === 0
                    ? _jsx("p", { className: "py-8 text-center text-xs text-dark-500", children: "No recent alerts" })
                    : recentAlerts.map((a) => (
                        _jsxs("div", { className: clsx("flex items-start gap-3 border-b border-dark-700/50 px-4 py-3 transition-colors hover:bg-dark-700/30", !a.isRead && "bg-dark-700/20"), children: [
                            _jsxs("div", { className: "flex-shrink-0 pt-0.5", children: [
                                _jsx("span", { className: "text-base", children: typeIcon(a.type) }),
                            ] }),
                            _jsxs("div", { className: "min-w-0 flex-1", children: [
                                _jsxs("div", { className: "flex items-center gap-2", children: [
                                    _jsx("span", { className: clsx("h-2 w-2 flex-shrink-0 rounded-full", priorityColor(a.priority)) }),
                                    _jsx("p", { className: "truncate text-sm font-medium text-white", children: a.title }),
                                ] }),
                                a.description && _jsx("p", { className: "mt-0.5 line-clamp-1 text-xs text-dark-400", children: a.description }),
                                _jsx("p", { className: "mt-1 text-[10px] text-dark-500", children: timeAgo(a.created_at) }),
                            ] }),
                            !a.isRead && _jsx("button", {
                                onClick: (e) => { e.stopPropagation(); dispatch(markAlertRead(a.id)); },
                                className: "flex-shrink-0 rounded p-1 text-dark-500 hover:bg-dark-600 hover:text-white",
                                title: "Mark as read",
                                children: _jsx(CheckIcon, { className: "h-3.5 w-3.5" }),
                            }),
                        ] }, a.id)
                    ))
                }),
            ] })),
        ] }),
        _jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setMenuOpen(!menuOpen), className: "flex items-center gap-2 rounded-lg p-2 text-dark-300 hover:bg-dark-800 hover:text-white", children: [_jsx(UserCircleIcon, { className: "h-6 w-6" }), _jsx("span", { className: "hidden text-sm font-medium sm:inline", children: user?.name })] }), menuOpen && (_jsxs("div", { className: "absolute right-0 mt-2 w-48 animate-fade-in rounded-lg border border-dark-700 bg-dark-800 py-1 shadow-xl", children: [_jsxs("div", { className: "border-b border-dark-700 px-4 py-2", children: [_jsx("p", { className: "text-sm font-medium text-white", children: user?.name }), _jsx("p", { className: "text-xs text-dark-400", children: user?.email }), _jsx("span", { className: clsx('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', user?.role === 'admin' && 'bg-primary-600/20 text-primary-400', user?.role === 'operator' && 'bg-emerald-600/20 text-emerald-400', user?.role === 'viewer' && 'bg-dark-600/50 text-dark-300'), children: user?.role })] }), _jsxs("button", { onClick: () => { setMenuOpen(false); logout(); }, className: "flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-dark-700", children: [_jsx(ArrowRightOnRectangleIcon, { className: "h-4 w-4" }), "Sign out"] })] }))] })] })] }));
}
