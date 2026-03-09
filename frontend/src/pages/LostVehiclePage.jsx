import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLostVehicles } from '@/store/slices/vehicleSlice';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import TrafficMap from '@/components/map/TrafficMap';
import VehicleMarker from '@/components/map/VehicleMarker';
import { formatDateTime, timeAgo } from '@/utils/formatters';
import { VEHICLE_ICONS, DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { vehiclesApi } from '@/api/vehicles.api';
import toast from 'react-hot-toast';
export default function LostVehiclePage() {
    const dispatch = useAppDispatch();
    const { lostVehicles, loading } = useAppSelector((s) => s.vehicles);
    const livePositions = useAppSelector((s) => s.tracking.livePositions);
    const [search, setSearch] = useState('');
    useEffect(() => {
        dispatch(fetchLostVehicles({ page: 1, limit: DEFAULT_PAGE_SIZE, search }));
    }, [dispatch, search]);
    const handleMarkFound = async (id) => {
        try {
            await vehiclesApi.markFound(id);
            toast.success('Vehicle marked as found');
            dispatch(fetchLostVehicles({ page: 1, limit: DEFAULT_PAGE_SIZE, search }));
        }
        catch {
            toast.error('Failed to mark vehicle as found');
        }
    };
    // Find live positions for lost vehicles
    const lostLive = livePositions.filter((p) => lostVehicles.some((v) => v.id === p.vehicleId));
    const columns = [
        {
            key: 'plate',
            header: 'Plate Number',
            render: (v) => (_jsxs("span", { className: "font-mono text-sm font-semibold text-red-400", children: [VEHICLE_ICONS[v.type], " ", v.plateNumber] })),
        },
        {
            key: 'type',
            header: 'Type',
            render: (v) => v.type,
        },
        {
            key: 'reportedAt',
            header: 'Reported',
            render: (v) => v.lostReportedAt ? (_jsx("span", { title: formatDateTime(v.lostReportedAt), children: timeAgo(v.lostReportedAt) })) : ('—'),
        },
        {
            key: 'lastSeen',
            header: 'Last Spotted',
            render: (v) => (v.lastSeenAt ? timeAgo(v.lastSeenAt) : 'Never'),
        },
        {
            key: 'status',
            header: 'Status',
            render: () => _jsx(StatusBadge, { label: "Lost", variant: "danger", dot: true }),
        },
        {
            key: 'actions',
            header: '',
            render: (v) => (_jsx("button", { onClick: () => handleMarkFound(v.id), className: "rounded-lg bg-emerald-600/10 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-600/20", children: "Mark Found" })),
        },
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: "Lost Vehicle Monitoring" }), _jsxs("p", { className: "mt-1 text-sm text-dark-400", children: ["Track and manage reported lost or stolen vehicles \u2014 ", lostVehicles.length, " active reports"] })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-5", children: [_jsxs("div", { className: "space-y-4 lg:col-span-3", children: [_jsx("input", { type: "text", placeholder: "Search by plate number...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2 text-sm text-white placeholder-dark-500 outline-none focus:border-primary-500" }), _jsx(DataTable, { columns: columns, data: lostVehicles, keyExtractor: (v) => v.id, loading: loading, emptyMessage: "No lost vehicles reported" })] }), _jsx("div", { className: "h-[500px] overflow-hidden rounded-xl border border-dark-700 lg:col-span-2", children: _jsx(TrafficMap, { children: lostLive.map((pos) => (_jsx(VehicleMarker, { record: pos, vehicleType: "car" }, pos.vehicleId))) }) })] })] }));
}
