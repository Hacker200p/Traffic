import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Marker, Popup } from 'react-map-gl';
import { useState } from 'react';
import { VideoCameraIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
export default function CameraMarker({ camera }) {
    const [showPopup, setShowPopup] = useState(false);
    const latitude = camera?.location?.latitude ?? camera?.latitude;
    const longitude = camera?.location?.longitude ?? camera?.longitude;
    if (latitude == null || longitude == null) {
        return null;
    }
    const isOnline = camera?.isOnline ?? camera?.is_online ?? false;
    const cameraType = camera?.type ?? camera?.cameraType ?? camera?.camera_type ?? 'fixed';
    const cameraName = camera?.name ?? 'Camera';
    return (_jsxs(_Fragment, { children: [_jsx(Marker, { longitude: longitude, latitude: latitude, anchor: "center", onClick: (e) => {
                    e.originalEvent.stopPropagation();
                    setShowPopup(true);
                }, children: _jsx("div", { className: clsx('flex h-7 w-7 cursor-pointer items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110', isOnline
                        ? 'bg-emerald-600 ring-2 ring-emerald-400/30'
                        : 'bg-dark-600 ring-2 ring-dark-500/30'), children: _jsx(VideoCameraIcon, { className: "h-3.5 w-3.5 text-white" }) }) }), showPopup && (_jsx(Popup, { longitude: longitude, latitude: latitude, anchor: "bottom", onClose: () => setShowPopup(false), closeButton: true, closeOnClick: false, className: "[&_.mapboxgl-popup-content]:!rounded-xl [&_.mapboxgl-popup-content]:!border [&_.mapboxgl-popup-content]:!border-dark-700 [&_.mapboxgl-popup-content]:!bg-dark-800 [&_.mapboxgl-popup-content]:!p-3 [&_.mapboxgl-popup-content]:!text-white", children: _jsxs("div", { className: "min-w-[140px]", children: [_jsx("p", { className: "text-sm font-semibold", children: cameraName }), _jsxs("p", { className: "text-xs text-dark-400", children: ["Type: ", cameraType] }), _jsx("span", { className: clsx('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold', isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'), children: isOnline ? 'Online' : 'Offline' })] }) }))] }));
}
