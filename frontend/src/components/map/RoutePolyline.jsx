import { jsx as _jsx } from "react/jsx-runtime";
import { Source, Layer } from 'react-map-gl';
export default function RoutePolyline({ route, color = '#3b82f6' }) {
    if (route.length < 2)
        return null;
    const geojson = {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: route.map((r) => [r.location.longitude, r.location.latitude]),
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
