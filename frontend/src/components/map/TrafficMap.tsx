import { useCallback, useRef, useState } from 'react';
import Map, { NavigationControl, FullscreenControl, GeolocateControl, MapRef } from 'react-map-gl';
import { MAPBOX_TOKEN, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '@/utils/constants';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Props {
  children?: React.ReactNode;
  className?: string;
  onMoveEnd?: (center: [number, number], zoom: number) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
}

export default function TrafficMap({
  children,
  className = 'h-full w-full',
  onMoveEnd,
  initialCenter,
  initialZoom,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    longitude: initialCenter?.[0] ?? MAP_DEFAULT_CENTER[0],
    latitude: initialCenter?.[1] ?? MAP_DEFAULT_CENTER[1],
    zoom: initialZoom ?? MAP_DEFAULT_ZOOM,
  });

  const handleMoveEnd = useCallback(() => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    const zoom = mapRef.current.getZoom();
    onMoveEnd?.([center.lng, center.lat], zoom);
  }, [onMoveEnd]);

  return (
    <div className={className}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onMoveEnd={handleMoveEnd}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
        reuseMaps
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        <GeolocateControl position="top-right" />
        {children}
      </Map>
    </div>
  );
}
