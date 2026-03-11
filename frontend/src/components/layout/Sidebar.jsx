import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { HomeIcon, MapIcon, TruckIcon, ShieldExclamationIcon, ChartBarIcon, MagnifyingGlassIcon, SignalIcon, CommandLineIcon, ExclamationTriangleIcon, MapPinIcon, } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import clsx from 'clsx';
const navItems = [
    { to: '/', label: 'Dashboard', icon: HomeIcon, roles: ['admin', 'police', 'analyst'] },
    { to: '/map', label: 'Live Map', icon: MapIcon, roles: ['admin', 'police', 'analyst'] },
    { to: '/vehicles', label: 'Vehicle Tracking', icon: TruckIcon, roles: ['admin', 'police'] },
    { to: '/lost-vehicles', label: 'Lost Vehicles', icon: MagnifyingGlassIcon, roles: ['admin', 'police'] },
    { to: '/violations', label: 'Violations', icon: ShieldExclamationIcon, roles: ['admin', 'police'] },
    { to: '/analytics', label: 'Analytics', icon: ChartBarIcon, roles: ['admin', 'analyst'] },
    { to: '/signals', label: 'Signals', icon: SignalIcon, roles: ['admin', 'police', 'analyst'] },
    { to: '/accidents', label: 'Accidents', icon: ExclamationTriangleIcon, roles: ['admin', 'police'] },
    { to: '/predict-route', label: 'Route Prediction', icon: MapPinIcon, roles: ['admin', 'police'] },
    { to: '/admin', label: 'Control Panel', icon: CommandLineIcon, roles: ['admin'] },
];
export default function Sidebar() {
    const { hasRole } = useAuth();
    return (_jsxs("aside", { className: "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-dark-700 bg-dark-900", children: [_jsxs("div", { className: "flex h-16 items-center gap-3 border-b border-dark-700 px-5", children: [_jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600", children: _jsx(SignalIcon, { className: "h-5 w-5 text-white" }) }), _jsx("span", { className: "text-lg font-bold tracking-tight text-white", children: "TrafficOS" })] }), _jsx("nav", { className: "flex-1 space-y-1 overflow-y-auto p-3", children: navItems
                    .filter((item) => hasRole(...item.roles))
                    .map((item) => (_jsxs(NavLink, { to: item.to, end: item.to === '/', className: ({ isActive }) => clsx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', isActive
                        ? 'bg-primary-600/10 text-primary-400'
                        : 'text-dark-300 hover:bg-dark-800 hover:text-white'), children: [_jsx(item.icon, { className: "h-5 w-5 flex-shrink-0" }), item.label] }, item.to))) }), _jsx("div", { className: "border-t border-dark-700 p-4", children: _jsx("p", { className: "text-xs text-dark-500", children: "\u00A9 2026 TrafficOS v1.0" }) })] }));
}
