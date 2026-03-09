import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLostVehicles } from '@/store/slices/vehicleSlice';
import DataTable, { Column } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import TrafficMap from '@/components/map/TrafficMap';
import VehicleMarker from '@/components/map/VehicleMarker';
import { formatDateTime, timeAgo } from '@/utils/formatters';
import { VEHICLE_ICONS, DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { vehiclesApi } from '@/api/vehicles.api';
import type { Vehicle } from '@/types';
import toast from 'react-hot-toast';

export default function LostVehiclePage() {
  const dispatch = useAppDispatch();
  const { lostVehicles, loading } = useAppSelector((s) => s.vehicles);
  const livePositions = useAppSelector((s) => s.tracking.livePositions);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchLostVehicles({ page: 1, limit: DEFAULT_PAGE_SIZE, search }));
  }, [dispatch, search]);

  const handleMarkFound = async (id: string) => {
    try {
      await vehiclesApi.markFound(id);
      toast.success('Vehicle marked as found');
      dispatch(fetchLostVehicles({ page: 1, limit: DEFAULT_PAGE_SIZE, search }));
    } catch {
      toast.error('Failed to mark vehicle as found');
    }
  };

  // Find live positions for lost vehicles
  const lostLive = livePositions.filter((p) =>
    lostVehicles.some((v) => v.id === p.vehicleId),
  );

  const columns: Column<Vehicle>[] = [
    {
      key: 'plate',
      header: 'Plate Number',
      render: (v) => (
        <span className="font-mono text-sm font-semibold text-red-400">
          {VEHICLE_ICONS[v.type]} {v.plateNumber}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (v) => v.type,
    },
    {
      key: 'reportedAt',
      header: 'Reported',
      render: (v) =>
        v.lostReportedAt ? (
          <span title={formatDateTime(v.lostReportedAt)}>{timeAgo(v.lostReportedAt)}</span>
        ) : (
          '—'
        ),
    },
    {
      key: 'lastSeen',
      header: 'Last Spotted',
      render: (v) => (v.lastSeenAt ? timeAgo(v.lastSeenAt) : 'Never'),
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <StatusBadge label="Lost" variant="danger" dot />,
    },
    {
      key: 'actions',
      header: '',
      render: (v) => (
        <button
          onClick={() => handleMarkFound(v.id)}
          className="rounded-lg bg-emerald-600/10 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-600/20"
        >
          Mark Found
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Lost Vehicle Monitoring</h1>
        <p className="mt-1 text-sm text-dark-400">
          Track and manage reported lost or stolen vehicles — {lostVehicles.length} active reports
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Table */}
        <div className="space-y-4 lg:col-span-3">
          <input
            type="text"
            placeholder="Search by plate number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2 text-sm text-white placeholder-dark-500 outline-none focus:border-primary-500"
          />
          <DataTable
            columns={columns}
            data={lostVehicles}
            keyExtractor={(v) => v.id}
            loading={loading}
            emptyMessage="No lost vehicles reported"
          />
        </div>

        {/* Map – lost vehicle sightings */}
        <div className="h-[500px] overflow-hidden rounded-xl border border-dark-700 lg:col-span-2">
          <TrafficMap>
            {lostLive.map((pos) => (
              <VehicleMarker
                key={pos.vehicleId}
                record={pos}
                vehicleType="car"
              />
            ))}
          </TrafficMap>
        </div>
      </div>
    </div>
  );
}
