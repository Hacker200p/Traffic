import { Marker, Popup } from 'react-map-gl';
import { useState } from 'react';
import type { TrackingRecord } from '@/types';
import { VEHICLE_ICONS } from '@/utils/constants';
import { formatTime } from '@/utils/formatters';

interface Props {
  record: TrackingRecord;
  vehicleType?: string;
  plateNumber?: string;
  onClick?: (vehicleId: string) => void;
}

export default function VehicleMarker({ record, vehicleType = 'car', plateNumber, onClick }: Props) {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <Marker
        longitude={record.location.longitude}
        latitude={record.location.latitude}
        anchor="center"
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setShowPopup(true);
          onClick?.(record.vehicleId);
        }}
      >
        <div
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary-600 text-base shadow-lg ring-2 ring-primary-400/30 transition-transform hover:scale-110"
          style={{
            transform: record.heading ? `rotate(${record.heading}deg)` : undefined,
          }}
        >
          {VEHICLE_ICONS[vehicleType] ?? '🚙'}
        </div>
      </Marker>

      {showPopup && (
        <Popup
          longitude={record.location.longitude}
          latitude={record.location.latitude}
          anchor="bottom"
          onClose={() => setShowPopup(false)}
          closeButton
          closeOnClick={false}
          className="!rounded-xl [&_.mapboxgl-popup-content]:!rounded-xl [&_.mapboxgl-popup-content]:!border [&_.mapboxgl-popup-content]:!border-dark-700 [&_.mapboxgl-popup-content]:!bg-dark-800 [&_.mapboxgl-popup-content]:!p-3 [&_.mapboxgl-popup-content]:!text-white"
        >
          <div className="min-w-[160px]">
            <p className="text-sm font-semibold">
              {VEHICLE_ICONS[vehicleType]} {plateNumber ?? record.vehicleId}
            </p>
            {record.speed != null && (
              <p className="text-xs text-dark-400">Speed: {record.speed.toFixed(0)} km/h</p>
            )}
            <p className="text-xs text-dark-500">{formatTime(record.timestamp)}</p>
          </div>
        </Popup>
      )}
    </>
  );
}
