import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Marker, Popup } from 'react-map-gl';
import { useState } from 'react';
import { VEHICLE_ICONS } from '@/utils/constants';
import { formatTime } from '@/utils/formatters';
export default function VehicleMarker({ record, vehicleType = 'car', plateNumber, onClick }) {
    const [showPopup, setShowPopup] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsx(Marker, { longitude: record.location.longitude, latitude: record.location.latitude, anchor: "center", onClick: (e) => {
                    e.originalEvent.stopPropagation();
                    setShowPopup(true);
                    onClick?.(record.vehicleId);
                }, children: _jsx("div", { className: "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary-600 text-base shadow-lg ring-2 ring-primary-400/30 transition-transform hover:scale-110", style: {
                        transform: record.heading ? `rotate(${record.heading}deg)` : undefined,
                    }, children: VEHICLE_ICONS[vehicleType] ?? '🚙' }) }), showPopup && (_jsx(Popup, { longitude: record.location.longitude, latitude: record.location.latitude, anchor: "bottom", onClose: () => setShowPopup(false), closeButton: true, closeOnClick: false, className: "!rounded-xl [&_.mapboxgl-popup-content]:!rounded-xl [&_.mapboxgl-popup-content]:!border [&_.mapboxgl-popup-content]:!border-dark-700 [&_.mapboxgl-popup-content]:!bg-dark-800 [&_.mapboxgl-popup-content]:!p-3 [&_.mapboxgl-popup-content]:!text-white", children: _jsxs("div", { className: "min-w-[160px]", children: [_jsxs("p", { className: "text-sm font-semibold", children: [VEHICLE_ICONS[vehicleType], " ", plateNumber ?? record.vehicleId] }), record.speed != null && (_jsxs("p", { className: "text-xs text-dark-400", children: ["Speed: ", record.speed.toFixed(0), " km/h"] })), _jsx("p", { className: "text-xs text-dark-500", children: formatTime(record.timestamp) })] }) }))] }));
}
