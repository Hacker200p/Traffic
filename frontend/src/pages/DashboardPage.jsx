import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { TruckIcon, ShieldExclamationIcon, SignalIcon, VideoCameraIcon, ExclamationTriangleIcon, BoltIcon, } from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAnalyticsSummary, fetchTrafficFlow, fetchViolationAnalytics, fetchDensityZones } from '@/store/slices/analyticsSlice';
import { fetchAlerts } from '@/store/slices/alertSlice';
import { fetchSignals } from '@/store/slices/signalSlice';
import { fetchLivePositions, fetchCameras } from '@/store/slices/trackingSlice';
import StatCard from '@/components/common/StatCard';
import TrafficFlowChart from '@/components/charts/TrafficFlowChart';
import ViolationChart from '@/components/charts/ViolationChart';
import AlertFeed from '@/components/dashboard/AlertFeed';
import SignalStatusPanel from '@/components/dashboard/SignalStatusPanel';
import TrafficMap from '@/components/map/TrafficMap';
import VehicleMarker from '@/components/map/VehicleMarker';
import CameraMarker from '@/components/map/CameraMarker';
import SignalMarker from '@/components/map/SignalMarker';
import CongestionHeatmap from '@/components/map/CongestionHeatmap';
import { formatNumber } from '@/utils/formatters';
import { densityLabel } from '@/utils/formatters';
import { REFRESH_INTERVAL_LIVE } from '@/utils/constants';
export default function DashboardPage() {
    const dispatch = useAppDispatch();
    const { summary, trafficFlow, violationStats, densityZones } = useAppSelector((s) => s.analytics);
    const livePositions = useAppSelector((s) => s.tracking.livePositions);
    const cameras = useAppSelector((s) => s.tracking.cameras);
    const signals = useAppSelector((s) => s.signals.items);
    useEffect(() => {
        dispatch(fetchAnalyticsSummary());
        dispatch(fetchTrafficFlow());
        dispatch(fetchViolationAnalytics());
        dispatch(fetchAlerts({ page: 1, limit: 10 }));
        dispatch(fetchSignals());
        dispatch(fetchLivePositions());
        dispatch(fetchCameras());
        dispatch(fetchDensityZones());
        const interval = setInterval(() => {
            dispatch(fetchLivePositions());
            dispatch(fetchDensityZones());
        }, REFRESH_INTERVAL_LIVE);
        return () => clearInterval(interval);
    }, [dispatch]);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: "Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-dark-400", children: "Real-time overview of the traffic control system" })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [_jsx(StatCard, { title: "Vehicles Today", value: formatNumber(summary?.totalVehiclesToday ?? 0), icon: _jsx(TruckIcon, { className: "h-5 w-5" }), trend: { value: 12, label: 'vs yesterday' } }), _jsx(StatCard, { title: "Violations Today", value: formatNumber(summary?.totalViolationsToday ?? 0), icon: _jsx(ShieldExclamationIcon, { className: "h-5 w-5" }), trend: { value: -8, label: 'vs yesterday' } }), _jsx(StatCard, { title: "Active Cameras", value: `${summary?.activeCameras ?? 0}`, icon: _jsx(VideoCameraIcon, { className: "h-5 w-5" }) }), _jsx(StatCard, { title: "Online Signals", value: `${summary?.onlineSignals ?? 0}`, icon: _jsx(SignalIcon, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [_jsx(StatCard, { title: "Avg Speed", value: `${summary?.avgSpeedKmh?.toFixed(0) ?? 0} km/h`, icon: _jsx(BoltIcon, { className: "h-5 w-5" }) }), _jsx(StatCard, { title: "Lost Vehicles", value: `${summary?.lostVehiclesCount ?? 0}`, icon: _jsx(ExclamationTriangleIcon, { className: "h-5 w-5" }) }), _jsx(StatCard, { title: "Traffic Density", value: densityLabel(summary?.densityLevel ?? 'low') ?? 'Low', subtitle: "Current system-wide" })] }), _jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800 p-4", children: [_jsx("h2", { className: "mb-3 text-lg font-semibold text-white", children: "Live Traffic Overview" }), _jsx("div", { className: "h-[350px] overflow-hidden rounded-lg", children: _jsxs(TrafficMap, { className: "h-full w-full", children: [densityZones.length > 0 && (_jsx(CongestionHeatmap, { zones: densityZones })), livePositions.map((pos) => (_jsx(VehicleMarker, { record: pos, plateNumber: pos.plateNumber }, pos.vehicleId))), cameras.map((cam) => (_jsx(CameraMarker, { camera: cam }, cam.id))), signals.filter((s) => s.location).map((sig) => (_jsx(SignalMarker, { signal: sig }, sig.id)))] }) }) ] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsx(TrafficFlowChart, { data: trafficFlow }), _jsx(ViolationChart, { data: violationStats })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsx(AlertFeed, {}), _jsx(SignalStatusPanel, {})] })] }));
}
