import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Marker, Popup } from 'react-map-gl';
import { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { timeAgo } from '@/utils/formatters';
import clsx from 'clsx';
export default function AlertPopup({ alert }) {
    const [showPopup, setShowPopup] = useState(false);
    if (!alert.location)
        return null;
    const priority = (alert.priority || '').toLowerCase();
    const isCritical = priority === 'critical' || priority === 'high';
    const isWarning = priority === 'warning' || priority === 'medium';
    const isInfo = priority === 'info' || priority === 'low';
    return (_jsxs(_Fragment, { children: [_jsx(Marker, { longitude: alert.location.longitude, latitude: alert.location.latitude, anchor: "center", onClick: (e) => {
                    e.originalEvent.stopPropagation();
                    setShowPopup(true);
                }, children: _jsx("div", { className: clsx('flex h-8 w-8 animate-pulse cursor-pointer items-center justify-center rounded-full shadow-lg', isCritical && 'bg-red-600 ring-2 ring-red-400/40', isWarning && 'bg-yellow-600 ring-2 ring-yellow-400/40', isInfo && 'bg-blue-600 ring-2 ring-blue-400/40'), children: _jsx(ExclamationTriangleIcon, { className: "h-4 w-4 text-white" }) }) }), showPopup && (_jsx(Popup, { longitude: alert.location.longitude, latitude: alert.location.latitude, anchor: "bottom", onClose: () => setShowPopup(false), closeButton: true, closeOnClick: false, className: "[&_.mapboxgl-popup-content]:!rounded-xl [&_.mapboxgl-popup-content]:!border [&_.mapboxgl-popup-content]:!border-dark-700 [&_.mapboxgl-popup-content]:!bg-dark-800 [&_.mapboxgl-popup-content]:!p-3 [&_.mapboxgl-popup-content]:!text-white", children: _jsxs("div", { className: "min-w-[180px]", children: [_jsxs("p", { className: "flex items-center gap-1.5 text-sm font-semibold", children: [_jsx(ExclamationTriangleIcon, { className: clsx('h-4 w-4', {
                                        'text-red-400': isCritical,
                                        'text-yellow-400': isWarning,
                                        'text-blue-400': isInfo,
                                    }) }), alert.title] }), _jsx("p", { className: "mt-1 text-xs text-dark-300", children: alert.message }), _jsx("p", { className: "mt-1 text-xs text-dark-500", children: timeAgo(alert.createdAt) })] }) }))] }));
}
