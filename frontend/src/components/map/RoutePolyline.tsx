import { Source, Layer } from 'react-map-gl';
import type { TrackingRecord } from '@/types';
import type { LineLayer } from 'mapbox-gl';

interface Props {
  route: TrackingRecord[];
  color?: string;
}

export default function RoutePolyline({ route, color = '#3b82f6' }: Props) {
  if (route.length < 2) return null;

  const geojson: GeoJSON.Feature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: route.map((r) => [r.location.longitude, r.location.latitude]),
    },
  };

  const layerStyle: LineLayer = {
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

  return (
    <Source id="route-line" type="geojson" data={geojson}>
      <Layer {...layerStyle} />
    </Source>
  );
}
