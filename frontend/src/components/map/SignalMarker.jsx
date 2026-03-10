import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Marker, Popup } from 'react-map-gl';
import { useState } from 'react';
import { SIGNAL_COLORS } from '@/utils/constants';
import clsx from 'clsx';

export default function SignalMarker({ signal }) {
    const [showPopup, setShowPopup] = useState(false);
    const color = SIGNAL_COLORS[signal.currentState] ?? SIGNAL_COLORS.off;

    return (_jsxs(_Fragment, { children: [
        _jsx(Marker, {
            longitude: signal.location.longitude,
            latitude: signal.location.latitude,
            anchor: "center",
            onClick: (e) => {
                e.originalEvent.stopPropagation();
                setShowPopup(true);
            },
            children: _jsx("div", {
                className: clsx(
                    'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110',
                    signal.isOnline ? 'ring-2 ring-white/20' : 'ring-2 ring-dark-500/30 opacity-50'
                ),
                style: { backgroundColor: color },
                children: _jsx("span", { className: "text-xs font-bold text-white", children: "🚦" })
            })
        }),
        showPopup && (_jsx(Popup, {
            longitude: signal.location.longitude,
            latitude: signal.location.latitude,
            anchor: "bottom",
            onClose: () => setShowPopup(false),
            closeButton: true,
            closeOnClick: false,
            className: "[&_.mapboxgl-popup-content]:!rounded-xl [&_.mapboxgl-popup-content]:!border [&_.mapboxgl-popup-content]:!border-dark-700 [&_.mapboxgl-popup-content]:!bg-dark-800 [&_.mapboxgl-popup-content]:!p-3 [&_.mapboxgl-popup-content]:!text-white",
            children: _jsxs("div", { className: "min-w-[150px]", children: [
                _jsx("p", { className: "text-sm font-semibold", children: signal.name ?? `Signal ${signal.id}` }),
                signal.intersection && _jsxs("p", { className: "text-xs text-dark-400", children: [signal.intersection] }),
                _jsxs("div", { className: "mt-1 flex items-center gap-2", children: [
                    _jsx("span", {
                        className: "inline-block h-3 w-3 rounded-full",
                        style: { backgroundColor: color }
                    }),
                    _jsx("span", { className: "text-xs capitalize text-dark-300", children: signal.currentState ?? 'off' }),
                    signal.remainingSeconds != null && _jsxs("span", { className: "text-xs text-dark-500", children: ["(", signal.remainingSeconds, "s)"] }),
                ] }),
                _jsx("span", {
                    className: clsx('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        signal.isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'),
                    children: signal.isOnline ? 'Online' : 'Offline'
                }),
            ] })
        }))
    ] }));
}
