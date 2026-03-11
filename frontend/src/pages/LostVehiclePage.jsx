import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLostVehicles } from '@/store/slices/vehicleSlice';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import TrafficMap from '@/components/map/TrafficMap';
import VehicleMarker from '@/components/map/VehicleMarker';
import CameraMarker from '@/components/map/CameraMarker';
import { formatDateTime, timeAgo } from '@/utils/formatters';
import { VEHICLE_ICONS, DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { vehiclesApi } from '@/api/vehicles.api';
import { trackingApi } from '@/api/tracking.api';
import { Marker, Popup } from 'react-map-gl';
import toast from 'react-hot-toast';
export default function LostVehiclePage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { lostVehicles, loading, stolenSightings } = useAppSelector((s) => s.vehicles);
    const livePositions = useAppSelector((s) => s.tracking.livePositions);
    const [search, setSearch] = useState('');
    const [lastSightings, setLastSightings] = useState([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState(null);
    useEffect(() => {
        dispatch(fetchLostVehicles({ page: 1, limit: DEFAULT_PAGE_SIZE, search }));
    }, [dispatch, search]);
    // Fetch last sightings when lost vehicles list updates
    useEffect(() => {
        if (lostVehicles.length === 0) { setLastSightings([]); return; }
        const ids = lostVehicles.map(v => v.id);
        trackingApi.getLastSightings(ids)
            .then(({ data }) => setLastSightings(data.data || []))
            .catch(() => {});
    }, [lostVehicles]);
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
    // Map of vehicleId → last sighting
    const sightingMap = useMemo(() => {
        const map = new Map();
        for (const s of lastSightings) map.set(s.vehicle_id, s);
        return map;
    }, [lastSightings]);
    // Find live positions for lost vehicles
    const lostLive = livePositions.filter((p) => lostVehicles.some((v) => v.id === p.vehicleId));
    // Sighting markers for the map (last known camera location per vehicle)
    const sightingMarkers = useMemo(() => {
        return lastSightings
            .filter(s => s.latitude && s.longitude)
            .map(s => ({
                ...s,
                vehicle: lostVehicles.find(v => v.id === s.vehicle_id),
            }));
    }, [lastSightings, lostVehicles]);
    // Realtime stolen sighting markers
    const realtimeMarkers = useMemo(() => {
        return stolenSightings
            .filter(s => s.latitude && s.longitude)
            .slice(0, 10);
    }, [stolenSightings]);
    const columns = [
        {
            key: 'plate',
            header: 'Plate Number',
            render: (v) => (_jsx("button", { onClick: () => setSelectedVehicleId(v.id === selectedVehicleId ? null : v.id), className: `font-mono text-sm font-semibold ${v.id === selectedVehicleId ? 'text-yellow-400' : 'text-red-400'} hover:underline`, children: _jsxs("span", { children: [VEHICLE_ICONS[v.type], " ", v.plateNumber] }) })),
        },
        {
            key: 'type',
            header: 'Type',
            render: (v) => v.type,
        },
        {
            key: 'reportedAt',
            header: 'Reported',
            render: (v) => v.updatedAt ? (_jsx("span", { title: formatDateTime(v.updatedAt), children: timeAgo(v.updatedAt) })) : ('—'),
        },
        {
            key: 'lastSeen',
            header: 'Last Spotted',
            render: (v) => {
                const s = sightingMap.get(v.id);
                if (s) {
                    return _jsxs("div", { children: [
                        _jsx("span", { className: "text-yellow-400 text-xs font-medium", children: s.camera_name || 'Camera' }),
                        _jsx("br", {}),
                        _jsx("span", { className: "text-dark-400 text-xs", children: timeAgo(s.detected_at) }),
                    ] });
                }
                return _jsx("span", { className: "text-dark-500 text-xs", children: "No sightings" });
            },
        },
        {
            key: 'status',
            header: 'Status',
            render: () => _jsx(StatusBadge, { label: "Lost", variant: "danger", dot: true }),
        },
        {
            key: 'actions',
            header: '',
            render: (v) => (_jsxs("div", { className: "flex items-center gap-2", children: [
                _jsx("button", { onClick: () => navigate(`/predict-route?vehicleId=${v.id}`), className: "rounded-lg bg-primary-600/10 px-3 py-1 text-xs font-medium text-primary-400 hover:bg-primary-600/20", children: "Predict Route" }),
                _jsx("button", { onClick: () => handleMarkFound(v.id), className: "rounded-lg bg-emerald-600/10 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-600/20", children: "Mark Found" }),
            ] })),
        },
    ];
    // Selected vehicle sighting detail
    const selectedSighting = selectedVehicleId ? sightingMap.get(selectedVehicleId) : null;
    const selectedVehicle = selectedVehicleId ? lostVehicles.find(v => v.id === selectedVehicleId) : null;
    return (_jsxs("div", { className: "space-y-6", children: [
        _jsxs("div", { children: [
            _jsx("h1", { className: "text-2xl font-bold text-white", children: "Lost Vehicle Monitoring" }),
            _jsxs("p", { className: "mt-1 text-sm text-dark-400", children: [
                "Track and manage reported lost or stolen vehicles — ", lostVehicles.length, " active reports",
            ] }),
        ] }),
        stolenSightings.length > 0 && (_jsxs("div", { className: "rounded-xl border border-red-800 bg-red-900/20 p-4", children: [
            _jsx("h3", { className: "text-sm font-semibold text-red-400 mb-2", children: "🚨 Recent Stolen Vehicle Detections" }),
            _jsx("div", { className: "space-y-2 max-h-32 overflow-y-auto", children:
                stolenSightings.slice(0, 5).map((s, i) => (
                    _jsxs("div", { className: "flex items-center justify-between text-xs", children: [
                        _jsxs("span", { className: "font-mono text-red-300", children: [s.plateNumber] }),
                        _jsxs("span", { className: "text-dark-400", children: [
                            s.cameraId ? `Camera: ${s.cameraId}` : '',
                            " · ", timeAgo(s.detectedAt),
                        ] }),
                    ] }, i)
                ))
            }),
        ] })),
        _jsxs("div", { className: "grid gap-6 lg:grid-cols-5", children: [
            _jsxs("div", { className: "space-y-4 lg:col-span-3", children: [
                _jsx("input", { type: "text", placeholder: "Search by plate number...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2 text-sm text-white placeholder-dark-500 outline-none focus:border-primary-500" }),
                _jsx(DataTable, { columns: columns, data: lostVehicles, keyExtractor: (v) => v.id, loading: loading, emptyMessage: "No lost vehicles reported" }),
            ] }),
            _jsxs("div", { className: "space-y-4 lg:col-span-2", children: [
                _jsx("div", { className: "h-[400px] overflow-hidden rounded-xl border border-dark-700", children:
                    _jsxs(TrafficMap, { children: [
                        lostLive.map((pos) => (
                            _jsx(VehicleMarker, { record: pos, vehicleType: "car" }, pos.vehicleId)
                        )),
                        sightingMarkers.map((s) => (
                            _jsx(Marker, {
                                key: `sight-${s.vehicle_id}`,
                                longitude: s.longitude,
                                latitude: s.latitude,
                                anchor: "center",
                                children: _jsx("div", {
                                    className: `flex h-6 w-6 items-center justify-center rounded-full text-[10px] shadow-lg ring-2 cursor-pointer ${s.vehicle_id === selectedVehicleId ? 'bg-yellow-500 ring-yellow-300/50' : 'bg-red-600 ring-red-400/30'}`,
                                    title: `${s.plate_text} — ${s.camera_name || 'Unknown camera'}`,
                                    children: "📍",
                                }),
                            })
                        )),
                        realtimeMarkers.map((s, i) => (
                            _jsx(Marker, {
                                key: `rt-${i}`,
                                longitude: s.longitude,
                                latitude: s.latitude,
                                anchor: "center",
                                children: _jsx("div", {
                                    className: "flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs shadow-lg ring-2 ring-red-300/50 animate-pulse",
                                    title: `DETECTED: ${s.plateNumber}`,
                                    children: "🚨",
                                }),
                            })
                        )),
                    ] }),
                }),
                selectedSighting && selectedVehicle && (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800 p-4 space-y-2", children: [
                    _jsx("h3", { className: "text-sm font-semibold text-white", children: "Last Sighting Details" }),
                    _jsxs("div", { className: "text-xs space-y-1", children: [
                        _jsxs("p", { children: [
                            _jsx("span", { className: "text-dark-400", children: "Vehicle: " }),
                            _jsx("span", { className: "font-mono text-red-400", children: selectedVehicle.plateNumber }),
                        ] }),
                        _jsxs("p", { children: [
                            _jsx("span", { className: "text-dark-400", children: "Camera: " }),
                            _jsx("span", { className: "text-white", children: selectedSighting.camera_name || selectedSighting.camera_id || 'Unknown' }),
                        ] }),
                        selectedSighting.intersection_name && _jsxs("p", { children: [
                            _jsx("span", { className: "text-dark-400", children: "Location: " }),
                            _jsx("span", { className: "text-white", children: selectedSighting.intersection_name }),
                        ] }),
                        _jsxs("p", { children: [
                            _jsx("span", { className: "text-dark-400", children: "Coordinates: " }),
                            _jsxs("span", { className: "text-white", children: [
                                parseFloat(selectedSighting.latitude).toFixed(5), ", ",
                                parseFloat(selectedSighting.longitude).toFixed(5),
                            ] }),
                        ] }),
                        _jsxs("p", { children: [
                            _jsx("span", { className: "text-dark-400", children: "Timestamp: " }),
                            _jsx("span", { className: "text-yellow-400", children: formatDateTime(selectedSighting.detected_at) }),
                        ] }),
                        selectedSighting.confidence && _jsxs("p", { children: [
                            _jsx("span", { className: "text-dark-400", children: "Confidence: " }),
                            _jsxs("span", { className: "text-white", children: [(parseFloat(selectedSighting.confidence) * 100).toFixed(0), "%"] }),
                        ] }),
                    ] }),
                ] })),
            ] }),
        ] }),
    ] }));
}
