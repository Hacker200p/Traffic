import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchVehicles, fetchVehicleById, fetchRiskProfile } from '@/store/slices/vehicleSlice';
import { fetchVehicleRoute, fetchVehicleMovement, fetchCameras, clearRoute } from '@/store/slices/trackingSlice';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import RiskBadge from '@/components/common/RiskBadge';
import VehicleRiskPanel from '@/components/dashboard/VehicleRiskPanel';
import TrafficMap from '@/components/map/TrafficMap';
import VehicleMarker from '@/components/map/VehicleMarker';
import RoutePolyline from '@/components/map/RoutePolyline';
import CameraMarker from '@/components/map/CameraMarker';
import { formatDateTime, formatTime, formatSpeed } from '@/utils/formatters';
import { VEHICLE_ICONS, DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { vehiclesApi } from '@/api/vehicles.api';
export default function VehicleTrackingPage() {
    const dispatch = useAppDispatch();
    const { items, loading, total, page } = useAppSelector((s) => s.vehicles);
    const { vehicleRoute, livePositions, movement, movementLoading, cameras } = useAppSelector((s) => s.tracking);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [plateSearch, setPlateSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activeTab, setActiveTab] = useState('timeline');
    const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);
    useEffect(() => {
        dispatch(fetchVehicles({ page: 1, limit: DEFAULT_PAGE_SIZE, search }));
    }, [dispatch, search]);
    useEffect(() => {
        dispatch(fetchCameras());
    }, [dispatch]);
    const handleSelect = (id, plateNumber) => {
        setSelectedId(id);
        dispatch(fetchVehicleById(id));
        dispatch(fetchVehicleRoute({ vehicleId: id }));
        dispatch(fetchRiskProfile(id));
        if (plateNumber) {
            setPlateSearch(plateNumber);
        }
    };
    const handleRecalculateRisk = useCallback(async () => {
        if (!selectedId) return;
        await vehiclesApi.recalculateRisk(selectedId);
        dispatch(fetchRiskProfile(selectedId));
    }, [selectedId, dispatch]);
    const handleTrackMovement = () => {
        if (!plateSearch.trim()) return;
        const params = { plateNumber: plateSearch.trim() };
        if (startDate) params.startDate = new Date(startDate).toISOString();
        if (endDate) params.endDate = new Date(endDate).toISOString();
        dispatch(fetchVehicleMovement(params));
    };
    const handleClearTracking = () => {
        dispatch(clearRoute());
        setPlateSearch('');
        setStartDate('');
        setEndDate('');
        setSelectedId(null);
    };
    const handlePageChange = (p) => {
        dispatch(fetchVehicles({ page: p, limit: DEFAULT_PAGE_SIZE, search }));
    };
    const selectedLive = livePositions.find((p) => p.vehicleId === selectedId);
    // Convert movement route to RoutePolyline format
    const movementRoute = useMemo(() => {
        if (!movement?.route) return [];
        return movement.route.map(p => ({
            location: { latitude: p.latitude, longitude: p.longitude },
            speed: p.speed,
            timestamp: p.timestamp,
        }));
    }, [movement]);
    // Camera markers for visited cameras
    const visitedCameraMarkers = useMemo(() => {
        if (!movement?.visitedCameras) return [];
        return movement.visitedCameras.map(c => ({
            id: c.cameraId,
            name: c.cameraName,
            type: c.cameraType,
            isOnline: true,
            location: { latitude: c.latitude, longitude: c.longitude },
        }));
    }, [movement]);
    const columns = [
        {
            key: 'plate',
            header: 'Plate',
            sortable: true,
            render: (v) => (_jsx("button", { onClick: () => handleSelect(v.id, v.plateNumber), className: "font-mono text-sm font-semibold text-primary-400 hover:underline", children: v.plateNumber })),
        },
        {
            key: 'type',
            header: 'Type',
            render: (v) => _jsxs("span", { children: [VEHICLE_ICONS[v.type], " ", v.type] }),
        },
        {
            key: 'status',
            header: 'Status',
            render: (v) => v.isBlacklisted ? (_jsx(StatusBadge, { label: "Lost", variant: "danger", dot: true })) : (_jsx(StatusBadge, { label: "Active", variant: "success", dot: true })),
        },
        {
            key: 'risk',
            header: 'Risk',
            sortable: true,
            render: (v) => v.risk_score != null && v.risk_score > 0
                ? _jsx(RiskBadge, { score: v.risk_score, rating: v.risk_rating })
                : _jsx("span", { className: "text-xs text-dark-500", children: "—" }),
        },
        {
            key: 'lastSeen',
            header: 'Last Seen',
            render: (v) => (v.updatedAt ? formatDateTime(v.updatedAt) : '—'),
        },
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: "Vehicle Tracking" }), _jsx("p", { className: "mt-1 text-sm text-dark-400", children: "Monitor and track vehicles across cameras" })] }),
        _jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800 p-4", children: [
            _jsx("h2", { className: "mb-3 text-sm font-semibold text-dark-300 uppercase tracking-wider", children: "Track Vehicle Movement" }),
            _jsxs("div", { className: "flex flex-wrap items-end gap-3", children: [
                _jsxs("div", { children: [
                    _jsx("label", { className: "mb-1 block text-xs text-dark-400", children: "Plate Number" }),
                    _jsx("input", { type: "text", placeholder: "e.g. ABC 1234", value: plateSearch, onChange: (e) => setPlateSearch(e.target.value), onKeyDown: (e) => e.key === 'Enter' && handleTrackMovement(), className: "w-40 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-white placeholder-dark-500 outline-none focus:border-primary-500" }),
                ] }),
                _jsxs("div", { children: [
                    _jsx("label", { className: "mb-1 block text-xs text-dark-400", children: "From" }),
                    _jsx("input", { type: "datetime-local", value: startDate, onChange: (e) => setStartDate(e.target.value), className: "rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-white outline-none focus:border-primary-500" }),
                ] }),
                _jsxs("div", { children: [
                    _jsx("label", { className: "mb-1 block text-xs text-dark-400", children: "To" }),
                    _jsx("input", { type: "datetime-local", value: endDate, onChange: (e) => setEndDate(e.target.value), className: "rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-white outline-none focus:border-primary-500" }),
                ] }),
                _jsx("button", { onClick: handleTrackMovement, disabled: !plateSearch.trim() || movementLoading, className: "rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50", children: movementLoading ? 'Tracking...' : 'Track' }),
                _jsx("button", { onClick: handleClearTracking, className: "rounded-lg border border-dark-600 px-4 py-2 text-sm text-dark-300 hover:text-white hover:border-dark-500", children: "Clear" }),
            ] }),
        ] }),
        _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [
            _jsxs("div", { className: "space-y-4", children: [
                _jsx("input", { type: "text", placeholder: "Search by plate number...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2 text-sm text-white placeholder-dark-500 outline-none focus:border-primary-500" }),
                _jsx(DataTable, { columns: columns, data: items, keyExtractor: (v) => v.id, page: page, totalPages: totalPages, onPageChange: handlePageChange, loading: loading, emptyMessage: "No vehicles found" }),
            ] }),
            _jsx("div", { className: "h-[600px] overflow-hidden rounded-xl border border-dark-700", children: _jsxs(TrafficMap, { children: [
                movementRoute.length > 0 ? _jsx(RoutePolyline, { route: movementRoute, color: "#10b981" }) : vehicleRoute.length > 0 && _jsx(RoutePolyline, { route: vehicleRoute }),
                visitedCameraMarkers.map(cam => _jsx(CameraMarker, { camera: cam }, cam.id)),
                selectedLive && (_jsx(VehicleMarker, { record: selectedLive })),
            ] }) }),
        ] }),
        selectedId && _jsx(VehicleRiskPanel, { vehicleId: selectedId, onRecalculate: handleRecalculateRisk }),
        movement && (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800 p-4 space-y-4", children: [
            _jsxs("div", { className: "flex items-center justify-between", children: [
                _jsxs("div", { children: [
                    _jsxs("h2", { className: "text-lg font-bold text-white", children: [movement.vehicle.plate_number, " — Movement Report"] }),
                    _jsxs("p", { className: "text-sm text-dark-400", children: [
                        movement.totalSightings, " camera sightings · ",
                        movement.totalTrackingPoints, " GPS points · ",
                        movement.visitedCameras.length, " cameras visited",
                    ] }),
                ] }),
            ] }),
            _jsxs("div", { className: "flex gap-2 border-b border-dark-700 pb-2", children: [
                _jsx("button", { onClick: () => setActiveTab('timeline'), className: `px-3 py-1.5 text-sm rounded-lg ${activeTab === 'timeline' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`, children: "Timeline" }),
                _jsx("button", { onClick: () => setActiveTab('speed'), className: `px-3 py-1.5 text-sm rounded-lg ${activeTab === 'speed' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`, children: "Speed Graph" }),
                _jsx("button", { onClick: () => setActiveTab('cameras'), className: `px-3 py-1.5 text-sm rounded-lg ${activeTab === 'cameras' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`, children: "Cameras Visited" }),
            ] }),
            activeTab === 'timeline' && (_jsx("div", { className: "max-h-80 overflow-y-auto", children:
                movement.timeline.length === 0
                    ? _jsx("p", { className: "text-sm text-dark-500", children: "No camera sightings in this time range." })
                    : _jsx("div", { className: "relative border-l-2 border-dark-600 pl-4 space-y-4", children:
                        movement.timeline.map((evt, i) => (
                            _jsxs("div", { className: "relative", children: [
                                _jsx("div", { className: "absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full bg-primary-500 ring-2 ring-dark-800" }),
                                _jsxs("div", { children: [
                                    _jsx("p", { className: "text-sm font-medium text-white", children: evt.cameraName }),
                                    evt.intersection && _jsx("p", { className: "text-xs text-dark-400", children: evt.intersection }),
                                    _jsxs("p", { className: "text-xs text-dark-500", children: [
                                        formatDateTime(evt.time),
                                        evt.speed != null && ` · ${formatSpeed(evt.speed)}`,
                                        evt.confidence != null && ` · ${(evt.confidence * 100).toFixed(0)}% conf`,
                                    ] }),
                                ] }),
                            ] }, i)
                        ))
                    })
            })),
            activeTab === 'speed' && (_jsx("div", { className: "h-64", children:
                movement.speedData.length === 0
                    ? _jsx("p", { className: "text-sm text-dark-500", children: "No speed data available." })
                    : _jsx(SpeedGraph, { data: movement.speedData })
            })),
            activeTab === 'cameras' && (_jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children:
                movement.visitedCameras.length === 0
                    ? _jsx("p", { className: "text-sm text-dark-500 col-span-full", children: "No cameras visited." })
                    : movement.visitedCameras.map((cam) => (
                        _jsxs("div", { className: "rounded-lg border border-dark-600 bg-dark-700 p-3", children: [
                            _jsx("p", { className: "text-sm font-semibold text-white", children: cam.cameraName }),
                            cam.intersection && _jsx("p", { className: "text-xs text-dark-400", children: cam.intersection }),
                            _jsxs("p", { className: "mt-1 text-xs text-dark-500", children: [
                                "First: ", formatDateTime(cam.firstSeen),
                            ] }),
                            _jsxs("p", { className: "text-xs text-dark-500", children: [
                                "Last: ", formatDateTime(cam.lastSeen),
                            ] }),
                            _jsxs("p", { className: "text-xs text-primary-400", children: [
                                cam.count, " sighting", cam.count !== 1 ? 's' : '',
                            ] }),
                        ] }, cam.cameraId)
                    ))
            })),
        ] })),
    ] }));
}
/** Simple SVG-based speed graph */
function SpeedGraph({ data }) {
    const width = 800;
    const height = 200;
    const padding = { top: 10, right: 10, bottom: 30, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const maxSpeed = Math.max(...data.map(d => d.speed), 1);
    const times = data.map(d => new Date(d.time).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime || 1;
    const points = data.map((d, i) => {
        const x = padding.left + ((times[i] - minTime) / timeRange) * chartW;
        const y = padding.top + chartH - (d.speed / maxSpeed) * chartH;
        return `${x},${y}`;
    }).join(' ');
    const areaPoints = `${padding.left},${padding.top + chartH} ${points} ${padding.left + ((times[times.length - 1] - minTime) / timeRange) * chartW},${padding.top + chartH}`;
    return (_jsxs("svg", { viewBox: `0 0 ${width} ${height}`, className: "h-full w-full", preserveAspectRatio: "none", children: [
        _jsx("polygon", { points: areaPoints, fill: "rgba(59,130,246,0.15)" }),
        _jsx("polyline", { points: points, fill: "none", stroke: "#3b82f6", strokeWidth: "2" }),
        _jsx("line", { x1: padding.left, y1: padding.top + chartH, x2: padding.left + chartW, y2: padding.top + chartH, stroke: "#374151", strokeWidth: "1" }),
        _jsx("line", { x1: padding.left, y1: padding.top, x2: padding.left, y2: padding.top + chartH, stroke: "#374151", strokeWidth: "1" }),
        _jsx("text", { x: padding.left - 5, y: padding.top + 4, textAnchor: "end", fill: "#9ca3af", fontSize: "10", children: `${maxSpeed.toFixed(0)}` }),
        _jsx("text", { x: padding.left - 5, y: padding.top + chartH, textAnchor: "end", fill: "#9ca3af", fontSize: "10", children: "0" }),
        _jsx("text", { x: padding.left, y: height - 5, fill: "#9ca3af", fontSize: "10", children: new Date(minTime).toLocaleTimeString() }),
        _jsx("text", { x: padding.left + chartW, y: height - 5, textAnchor: "end", fill: "#9ca3af", fontSize: "10", children: new Date(maxTime).toLocaleTimeString() }),
        _jsx("text", { x: padding.left - 5, y: padding.top + chartH / 2, textAnchor: "end", fill: "#6b7280", fontSize: "9", dominantBaseline: "middle", children: "km/h" }),
        data.map((d, i) => {
            const x = padding.left + ((times[i] - minTime) / timeRange) * chartW;
            const y = padding.top + chartH - (d.speed / maxSpeed) * chartH;
            return _jsx("circle", { cx: x, cy: y, r: "3", fill: d.speed > 80 ? "#ef4444" : d.speed > 60 ? "#f97316" : "#3b82f6" }, i);
        }),
    ] }));
}
