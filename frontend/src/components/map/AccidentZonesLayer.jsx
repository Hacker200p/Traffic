import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Source, Layer } from 'react-map-gl';

const RISK_COLORS = {
    low: '#3b82f6',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444',
};

export default function AccidentZonesLayer({ zones }) {
    const geojson = {
        type: 'FeatureCollection',
        features: zones.map((zone, i) => ({
            type: 'Feature',
            properties: {
                risk: zone.risk,
                incidents: zone.incidentCount,
                accidents: zone.accidentCount,
                color: RISK_COLORS[zone.risk] ?? RISK_COLORS.low,
            },
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [zone.bounds[0].longitude, zone.bounds[0].latitude],
                        [zone.bounds[1].longitude, zone.bounds[0].latitude],
                        [zone.bounds[1].longitude, zone.bounds[1].latitude],
                        [zone.bounds[0].longitude, zone.bounds[1].latitude],
                        [zone.bounds[0].longitude, zone.bounds[0].latitude],
                    ],
                ],
            },
        })),
    };

    const fillStyle = {
        id: 'accident-zones-fill',
        type: 'fill',
        paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.35,
        },
    };

    const outlineStyle = {
        id: 'accident-zones-outline',
        type: 'line',
        paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-dasharray': [3, 2],
        },
    };

    return (_jsxs(Source, { id: "accident-zones", type: "geojson", data: geojson, children: [
        _jsx(Layer, { ...fillStyle }),
        _jsx(Layer, { ...outlineStyle }),
    ] }));
}
