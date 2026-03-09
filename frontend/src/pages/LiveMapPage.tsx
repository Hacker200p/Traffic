import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLivePositions } from '@/store/slices/trackingSlice';
import { fetchAlerts } from '@/store/slices/alertSlice';
import TrafficMap from '@/components/map/TrafficMap';
import VehicleMarker from '@/components/map/VehicleMarker';
import CongestionHeatmap from '@/components/map/CongestionHeatmap';
import AlertPopup from '@/components/map/AlertPopup';
import { REFRESH_INTERVAL_LIVE } from '@/utils/constants';
import type { DensityZone } from '@/types';

export default function LiveMapPage() {
  const dispatch = useAppDispatch();
  const livePositions = useAppSelector((s) => s.tracking.livePositions);
  const alerts = useAppSelector((s) => s.alerts.items.filter((a) => a.location));

  // Layers toggles
  const [showVehicles, setShowVehicles] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);

  // Placeholder density zones (normally fetched from backend)
  const [densityZones] = useState<DensityZone[]>([]);

  useEffect(() => {
    dispatch(fetchLivePositions());
    dispatch(fetchAlerts({ page: 1, limit: 50 }));

    const interval = setInterval(() => {
      dispatch(fetchLivePositions());
    }, REFRESH_INTERVAL_LIVE);
    return () => clearInterval(interval);
  }, [dispatch]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Traffic Map</h1>
          <p className="text-sm text-dark-400">
            {livePositions.length} vehicles tracked in real-time
          </p>
        </div>

        {/* Layer toggles */}
        <div className="flex gap-2">
          {[
            { label: 'Vehicles', active: showVehicles, toggle: () => setShowVehicles((v) => !v) },
            { label: 'Heatmap', active: showHeatmap, toggle: () => setShowHeatmap((v) => !v) },
            { label: 'Alerts', active: showAlerts, toggle: () => setShowAlerts((v) => !v) },
          ].map((layer) => (
            <button
              key={layer.label}
              onClick={layer.toggle}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                layer.active
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 overflow-hidden rounded-xl border border-dark-700">
        <TrafficMap className="h-full w-full">
          {/* Live vehicle markers */}
          {showVehicles &&
            livePositions.map((pos) => (
              <VehicleMarker
                key={pos.vehicleId}
                record={pos}
                plateNumber={pos.plateNumber}
              />
            ))}

          {/* Congestion heatmap */}
          {showHeatmap && densityZones.length > 0 && (
            <CongestionHeatmap zones={densityZones} />
          )}

          {/* Alerts with location */}
          {showAlerts &&
            alerts.map((alert) => <AlertPopup key={alert.id} alert={alert} />)}
        </TrafficMap>
      </div>
    </div>
  );
}
