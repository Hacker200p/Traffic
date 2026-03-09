import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useRef, useState } from 'react';
import Map, { NavigationControl, FullscreenControl, GeolocateControl } from 'react-map-gl';
import { MAPBOX_TOKEN, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '@/utils/constants';
import 'mapbox-gl/dist/mapbox-gl.css';
export default function TrafficMap({ children, className = 'h-full w-full', onMoveEnd, initialCenter, initialZoom, }) {
    const mapRef = useRef(null);
    const [viewState, setViewState] = useState({
        longitude: initialCenter?.[0] ?? MAP_DEFAULT_CENTER[0],
        latitude: initialCenter?.[1] ?? MAP_DEFAULT_CENTER[1],
        zoom: initialZoom ?? MAP_DEFAULT_ZOOM,
    });
    const handleMoveEnd = useCallback(() => {
        if (!mapRef.current)
            return;
        const center = mapRef.current.getCenter();
        const zoom = mapRef.current.getZoom();
        onMoveEnd?.([center.lng, center.lat], zoom);
    }, [onMoveEnd]);
    return (_jsx("div", { className: className, children: _jsxs(Map, { ref: mapRef, ...viewState, onMove: (evt) => setViewState(evt.viewState), onMoveEnd: handleMoveEnd, mapStyle: "mapbox://styles/mapbox/dark-v11", mapboxAccessToken: MAPBOX_TOKEN, attributionControl: false, reuseMaps: true, style: { width: '100%', height: '100%' }, children: [_jsx(NavigationControl, { position: "top-right" }), _jsx(FullscreenControl, { position: "top-right" }), _jsx(GeolocateControl, { position: "top-right" }), children] }) }));
}
