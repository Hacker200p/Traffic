import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Source, Layer } from 'react-map-gl';
import { DENSITY_COLORS } from '@/utils/constants';
export default function CongestionHeatmap({ zones }) {
    const geojson = {
        type: 'FeatureCollection',
        features: zones.map((zone) => ({
            type: 'Feature',
            properties: {
                level: zone.level,
                vehicleCount: zone.vehicleCount,
                occupancy: zone.occupancyRatio,
                color: DENSITY_COLORS[zone.level] ?? DENSITY_COLORS.low,
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
    const layerStyle = {
        id: 'density-fill',
        type: 'fill',
        paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.25,
        },
    };
    const outlineStyle = {
        id: 'density-outline',
        type: 'fill',
        paint: {
            'fill-color': 'transparent',
            'fill-outline-color': ['get', 'color'],
        },
    };
    return (_jsxs(Source, { id: "density-zones", type: "geojson", data: geojson, children: [_jsx(Layer, { ...layerStyle }), _jsx(Layer, { ...outlineStyle })] }));
}
