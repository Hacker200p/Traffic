import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Source, Layer } from 'react-map-gl';

const RISK_COLORS = {
    low: '#3b82f6',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444',
};

export default function AccidentZonesLayer({ zones }) {
    const validZones = (Array.isArray(zones) ? zones : []).map((zone) => {
        const b0 = zone?.bounds?.[0];
        const b1 = zone?.bounds?.[1];
        const minLat = Number(b0?.latitude);
        const minLng = Number(b0?.longitude);
        const maxLat = Number(b1?.latitude);
        const maxLng = Number(b1?.longitude);
        if (![minLat, minLng, maxLat, maxLng].every(Number.isFinite)) {
            return null;
        }
        return {
            ...zone,
            incidentCount: Number(zone?.incidentCount ?? 0),
            accidentCount: Number(zone?.accidentCount ?? 0),
            severeCount: Number(zone?.severeCount ?? 0),
            bounds: [
                { latitude: minLat, longitude: minLng },
                { latitude: maxLat, longitude: maxLng },
            ],
            center: {
                latitude: (minLat + maxLat) / 2,
                longitude: (minLng + maxLng) / 2,
            },
        };
    }).filter(Boolean);

    if (validZones.length === 0) {
        return null;
    }

    const geojson = {
        type: 'FeatureCollection',
        features: validZones.map((zone) => ({
            type: 'Feature',
            properties: {
                risk: zone.risk,
                incidents: zone.incidentCount,
                accidents: zone.accidentCount,
                severe: zone.severeCount,
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

    const hotspotGeojson = {
        type: 'FeatureCollection',
        features: validZones.map((zone) => ({
            type: 'Feature',
            properties: {
                incidents: zone.incidentCount,
                accidents: zone.accidentCount,
                risk: zone.risk,
                color: RISK_COLORS[zone.risk] ?? RISK_COLORS.low,
            },
            geometry: {
                type: 'Point',
                coordinates: [zone.center.longitude, zone.center.latitude],
            },
        })),
    };

    const fillStyle = {
        id: 'accident-zones-fill',
        type: 'fill',
        paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': [
                'interpolate',
                ['linear'],
                ['get', 'incidents'],
                1, 0.18,
                3, 0.28,
                6, 0.4,
                10, 0.52,
            ],
        },
    };

    const outlineStyle = {
        id: 'accident-zones-outline',
        type: 'line',
        paint: {
            'line-color': ['get', 'color'],
            'line-width': 2.5,
            'line-dasharray': [3, 2],
        },
    };

    const hotspotStyle = {
        id: 'accident-zones-hotspots',
        type: 'circle',
        paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['get', 'incidents'],
                1, 8,
                3, 11,
                6, 15,
                10, 20,
            ],
            'circle-opacity': 0.9,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.2,
        },
    };

    return (_jsxs(_Fragment, { children: [_jsxs(Source, { id: "accident-zones", type: "geojson", data: geojson, children: [
                _jsx(Layer, { ...fillStyle }),
                _jsx(Layer, { ...outlineStyle }),
            ] }), _jsx(Source, { id: "accident-zones-hotspots", type: "geojson", data: hotspotGeojson, children: _jsx(Layer, { ...hotspotStyle }) })] }));
}
