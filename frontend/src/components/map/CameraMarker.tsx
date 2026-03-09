import { Marker, Popup } from 'react-map-gl';
import { useState } from 'react';
import { VideoCameraIcon } from '@heroicons/react/24/solid';
import type { Camera } from '@/types';
import clsx from 'clsx';

interface Props {
  camera: Camera;
}

export default function CameraMarker({ camera }: Props) {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <Marker
        longitude={camera.location.longitude}
        latitude={camera.location.latitude}
        anchor="center"
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setShowPopup(true);
        }}
      >
        <div
          className={clsx(
            'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110',
            camera.isOnline
              ? 'bg-emerald-600 ring-2 ring-emerald-400/30'
              : 'bg-dark-600 ring-2 ring-dark-500/30',
          )}
        >
          <VideoCameraIcon className="h-3.5 w-3.5 text-white" />
        </div>
      </Marker>

      {showPopup && (
        <Popup
          longitude={camera.location.longitude}
          latitude={camera.location.latitude}
          anchor="bottom"
          onClose={() => setShowPopup(false)}
          closeButton
          closeOnClick={false}
          className="[&_.mapboxgl-popup-content]:!rounded-xl [&_.mapboxgl-popup-content]:!border [&_.mapboxgl-popup-content]:!border-dark-700 [&_.mapboxgl-popup-content]:!bg-dark-800 [&_.mapboxgl-popup-content]:!p-3 [&_.mapboxgl-popup-content]:!text-white"
        >
          <div className="min-w-[140px]">
            <p className="text-sm font-semibold">{camera.name}</p>
            <p className="text-xs text-dark-400">Type: {camera.type}</p>
            <span
              className={clsx(
                'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                camera.isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
              )}
            >
              {camera.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </Popup>
      )}
    </>
  );
}
