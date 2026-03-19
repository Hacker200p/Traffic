import { jsx as _jsx } from "react/jsx-runtime";
import { Source, Layer } from 'react-map-gl';
export default function RoutePolyline({ route, color = '#3b82f6' }) {
    const points = Array.isArray(route) ? route : [];
    const coordinates = points
        .map((point) => {
        const latitude = point?.location?.latitude ?? point?.latitude;
        const longitude = point?.location?.longitude ?? point?.longitude;
        if (latitude == null || longitude == null)
            return null;
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng))
            return null;
        return [lng, lat];
    })
        .filter(Boolean);
    if (coordinates.length < 2)
        return null;
    const geojson = {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates,
        },
    };
    const layerStyle = {
        id: 'vehicle-route',
        type: 'line',
        paint: {
            'line-color': color,
            'line-width': 3,
            'line-opacity': 0.8,
        },
        layout: {
            'line-join': 'round',
            'line-cap': 'round',
        },
    };
    return (_jsx(Source, { id: "route-line", type: "geojson", data: geojson, children: _jsx(Layer, { ...layerStyle }) }));
}
