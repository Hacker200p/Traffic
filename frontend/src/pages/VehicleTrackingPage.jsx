import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchVehicles, fetchVehicleById } from '@/store/slices/vehicleSlice';
import { fetchVehicleRoute } from '@/store/slices/trackingSlice';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import TrafficMap from '@/components/map/TrafficMap';
import VehicleMarker from '@/components/map/VehicleMarker';
import RoutePolyline from '@/components/map/RoutePolyline';
import { formatDateTime } from '@/utils/formatters';
import { VEHICLE_ICONS, DEFAULT_PAGE_SIZE } from '@/utils/constants';
export default function VehicleTrackingPage() {
    const dispatch = useAppDispatch();
    const { items, loading, total, page } = useAppSelector((s) => s.vehicles);
    const { vehicleRoute, livePositions } = useAppSelector((s) => s.tracking);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);
    useEffect(() => {
        dispatch(fetchVehicles({ page: 1, limit: DEFAULT_PAGE_SIZE, search }));
    }, [dispatch, search]);
    const handleSelect = (id) => {
        setSelectedId(id);
        dispatch(fetchVehicleById(id));
        dispatch(fetchVehicleRoute({ vehicleId: id }));
    };
    const handlePageChange = (p) => {
        dispatch(fetchVehicles({ page: p, limit: DEFAULT_PAGE_SIZE, search }));
    };
    const selectedLive = livePositions.find((p) => p.vehicleId === selectedId);
    const columns = [
        {
            key: 'plate',
            header: 'Plate',
            sortable: true,
            render: (v) => (_jsx("button", { onClick: () => handleSelect(v.id), className: "font-mono text-sm font-semibold text-primary-400 hover:underline", children: v.plateNumber })),
        },
        {
            key: 'type',
            header: 'Type',
            render: (v) => _jsxs("span", { children: [VEHICLE_ICONS[v.type], " ", v.type] }),
        },
        {
            key: 'status',
            header: 'Status',
            render: (v) => v.isLost ? (_jsx(StatusBadge, { label: "Lost", variant: "danger", dot: true })) : (_jsx(StatusBadge, { label: "Active", variant: "success", dot: true })),
        },
        {
            key: 'lastSeen',
            header: 'Last Seen',
            render: (v) => (v.lastSeenAt ? formatDateTime(v.lastSeenAt) : '—'),
        },
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: "Vehicle Tracking" }), _jsx("p", { className: "mt-1 text-sm text-dark-400", children: "Monitor and track vehicles across cameras" })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", placeholder: "Search by plate number...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2 text-sm text-white placeholder-dark-500 outline-none focus:border-primary-500" }), _jsx(DataTable, { columns: columns, data: items, keyExtractor: (v) => v.id, page: page, totalPages: totalPages, onPageChange: handlePageChange, loading: loading, emptyMessage: "No vehicles found" })] }), _jsx("div", { className: "h-[600px] overflow-hidden rounded-xl border border-dark-700", children: _jsxs(TrafficMap, { children: [vehicleRoute.length > 0 && _jsx(RoutePolyline, { route: vehicleRoute }), selectedLive && (_jsx(VehicleMarker, { record: selectedLive }))] }) })] })] }));
}
