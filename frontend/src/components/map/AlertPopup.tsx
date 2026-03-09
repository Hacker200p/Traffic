import { Marker, Popup } from 'react-map-gl';
import { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import type { Alert } from '@/types';
import { timeAgo } from '@/utils/formatters';
import clsx from 'clsx';

interface Props {
  alert: Alert;
}

export default function AlertPopup({ alert }: Props) {
  const [showPopup, setShowPopup] = useState(false);

  if (!alert.location) return null;

  return (
    <>
      <Marker
        longitude={alert.location.longitude}
        latitude={alert.location.latitude}
        anchor="center"
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setShowPopup(true);
        }}
      >
        <div
          className={clsx(
            'flex h-8 w-8 animate-pulse cursor-pointer items-center justify-center rounded-full shadow-lg',
            alert.priority === 'critical' && 'bg-red-600 ring-2 ring-red-400/40',
            alert.priority === 'warning' && 'bg-yellow-600 ring-2 ring-yellow-400/40',
            alert.priority === 'info' && 'bg-blue-600 ring-2 ring-blue-400/40',
          )}
        >
          <ExclamationTriangleIcon className="h-4 w-4 text-white" />
        </div>
      </Marker>

      {showPopup && (
        <Popup
          longitude={alert.location.longitude}
          latitude={alert.location.latitude}
          anchor="bottom"
          onClose={() => setShowPopup(false)}
          closeButton
          closeOnClick={false}
          className="[&_.mapboxgl-popup-content]:!rounded-xl [&_.mapboxgl-popup-content]:!border [&_.mapboxgl-popup-content]:!border-dark-700 [&_.mapboxgl-popup-content]:!bg-dark-800 [&_.mapboxgl-popup-content]:!p-3 [&_.mapboxgl-popup-content]:!text-white"
        >
          <div className="min-w-[180px]">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <ExclamationTriangleIcon
                className={clsx('h-4 w-4', {
                  'text-red-400': alert.priority === 'critical',
                  'text-yellow-400': alert.priority === 'warning',
                  'text-blue-400': alert.priority === 'info',
                })}
              />
              {alert.title}
            </p>
            <p className="mt-1 text-xs text-dark-300">{alert.message}</p>
            <p className="mt-1 text-xs text-dark-500">{timeAgo(alert.createdAt)}</p>
          </div>
        </Popup>
      )}
    </>
  );
}
