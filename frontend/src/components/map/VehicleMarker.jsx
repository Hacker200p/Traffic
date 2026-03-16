import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Marker, Popup } from 'react-map-gl';
import { useState } from 'react';
import { VEHICLE_ICONS } from '@/utils/constants';
import { formatTime } from '@/utils/formatters';
export default function VehicleMarker({ record, vehicleType = 'car', plateNumber, onClick }) {
    const [showPopup, setShowPopup] = useState(false);
    const latitude = record?.location?.latitude ?? record?.latitude;
    const longitude = record?.location?.longitude ?? record?.longitude;
    if (latitude == null || longitude == null) {
        return null;
    }
    const heading = record?.heading == null ? null : Number(record.heading);
    const speed = record?.speed == null ? null : Number(record.speed);
    const resolvedVehicleType = vehicleType ?? record?.vehicleType ?? record?.vehicle_type ?? 'car';
    const resolvedVehicleId = record?.vehicleId ?? record?.vehicle_id ?? record?.id;
    const resolvedPlate = plateNumber ?? record?.plateNumber ?? record?.plate_number ?? resolvedVehicleId;
    const resolvedTimestamp = record?.timestamp ?? record?.recordedAt ?? record?.recorded_at;
    return (_jsxs(_Fragment, { children: [_jsx(Marker, { longitude: longitude, latitude: latitude, anchor: "center", onClick: (e) => {
                    e.originalEvent.stopPropagation();
                    setShowPopup(true);
                    onClick?.(resolvedVehicleId);
                }, children: _jsx("div", { className: "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary-600 text-base shadow-lg ring-2 ring-primary-400/30 transition-transform hover:scale-110", style: {
                        transform: Number.isFinite(heading) ? `rotate(${heading}deg)` : undefined,
                    }, children: VEHICLE_ICONS[resolvedVehicleType] ?? '🚙' }) }), showPopup && (_jsx(Popup, { longitude: longitude, latitude: latitude, anchor: "bottom", onClose: () => setShowPopup(false), closeButton: true, closeOnClick: false, className: "!rounded-xl [&_.mapboxgl-popup-content]:!rounded-xl [&_.mapboxgl-popup-content]:!border [&_.mapboxgl-popup-content]:!border-dark-700 [&_.mapboxgl-popup-content]:!bg-dark-800 [&_.mapboxgl-popup-content]:!p-3 [&_.mapboxgl-popup-content]:!text-white", children: _jsxs("div", { className: "min-w-[160px]", children: [_jsxs("p", { className: "text-sm font-semibold", children: [VEHICLE_ICONS[resolvedVehicleType] ?? '🚙', " ", resolvedPlate] }), Number.isFinite(speed) && (_jsxs("p", { className: "text-xs text-dark-400", children: ["Speed: ", speed.toFixed(0), " km/h"] })), _jsx("p", { className: "text-xs text-dark-500", children: formatTime(resolvedTimestamp) })] }) }))] }));
}
