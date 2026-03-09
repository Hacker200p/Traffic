import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchVehicles, fetchVehicleById } from '@/store/slices/vehicleSlice';
import { fetchVehicleRoute, clearRoute } from '@/store/slices/trackingSlice';
import DataTable, { Column } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import TrafficMap from '@/components/map/TrafficMap';
import VehicleMarker from '@/components/map/VehicleMarker';
import RoutePolyline from '@/components/map/RoutePolyline';
import { formatDateTime } from '@/utils/formatters';
import { VEHICLE_ICONS, DEFAULT_PAGE_SIZE } from '@/utils/constants';
import type { Vehicle } from '@/types';

export default function VehicleTrackingPage() {
  const dispatch = useAppDispatch();
  const { items, loading, total, page } = useAppSelector((s) => s.vehicles);
  const { vehicleRoute, livePositions } = useAppSelector((s) => s.tracking);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);

  useEffect(() => {
    dispatch(fetchVehicles({ page: 1, limit: DEFAULT_PAGE_SIZE, search }));
  }, [dispatch, search]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    dispatch(fetchVehicleById(id));
    dispatch(fetchVehicleRoute({ vehicleId: id }));
  };

  const handlePageChange = (p: number) => {
    dispatch(fetchVehicles({ page: p, limit: DEFAULT_PAGE_SIZE, search }));
  };

  const selectedLive = livePositions.find((p) => p.vehicleId === selectedId);

  const columns: Column<Vehicle>[] = [
    {
      key: 'plate',
      header: 'Plate',
      sortable: true,
      render: (v) => (
        <button onClick={() => handleSelect(v.id)} className="font-mono text-sm font-semibold text-primary-400 hover:underline">
          {v.plateNumber}
        </button>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (v) => <span>{VEHICLE_ICONS[v.type]} {v.type}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) =>
        v.isLost ? (
          <StatusBadge label="Lost" variant="danger" dot />
        ) : (
          <StatusBadge label="Active" variant="success" dot />
        ),
    },
    {
      key: 'lastSeen',
      header: 'Last Seen',
      render: (v) => (v.lastSeenAt ? formatDateTime(v.lastSeenAt) : '—'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Vehicle Tracking</h1>
        <p className="mt-1 text-sm text-dark-400">Monitor and track vehicles across cameras</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left – Table */}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search by plate number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2 text-sm text-white placeholder-dark-500 outline-none focus:border-primary-500"
          />
          <DataTable
            columns={columns}
            data={items}
            keyExtractor={(v) => v.id}
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            loading={loading}
            emptyMessage="No vehicles found"
          />
        </div>

        {/* Right – Map with route */}
        <div className="h-[600px] overflow-hidden rounded-xl border border-dark-700">
          <TrafficMap>
            {vehicleRoute.length > 0 && <RoutePolyline route={vehicleRoute} />}
            {selectedLive && (
              <VehicleMarker record={selectedLive} />
            )}
          </TrafficMap>
        </div>
      </div>
    </div>
  );
}
