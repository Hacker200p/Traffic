import { Source, Layer } from 'react-map-gl';
import type { DensityZone } from '@/types';
import { DENSITY_COLORS } from '@/utils/constants';
import type { FillLayer } from 'mapbox-gl';

interface Props {
  zones: DensityZone[];
}

export default function CongestionHeatmap({ zones }: Props) {
  const geojson: GeoJSON.FeatureCollection = {
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

  const layerStyle: FillLayer = {
    id: 'density-fill',
    type: 'fill',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': 0.25,
    },
  };

  const outlineStyle: FillLayer = {
    id: 'density-outline',
    type: 'fill',
    paint: {
      'fill-color': 'transparent',
      'fill-outline-color': ['get', 'color'],
    },
  };

  return (
    <Source id="density-zones" type="geojson" data={geojson}>
      <Layer {...layerStyle} />
      <Layer {...outlineStyle} />
    </Source>
  );
}
