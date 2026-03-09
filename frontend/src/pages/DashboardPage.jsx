import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { TruckIcon, ShieldExclamationIcon, SignalIcon, VideoCameraIcon, ExclamationTriangleIcon, BoltIcon, } from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAnalyticsSummary, fetchTrafficFlow, fetchViolationAnalytics } from '@/store/slices/analyticsSlice';
import { fetchAlerts } from '@/store/slices/alertSlice';
import { fetchSignals } from '@/store/slices/signalSlice';
import StatCard from '@/components/common/StatCard';
import TrafficFlowChart from '@/components/charts/TrafficFlowChart';
import ViolationChart from '@/components/charts/ViolationChart';
import AlertFeed from '@/components/dashboard/AlertFeed';
import SignalStatusPanel from '@/components/dashboard/SignalStatusPanel';
import { formatNumber } from '@/utils/formatters';
import { densityLabel } from '@/utils/formatters';
export default function DashboardPage() {
    const dispatch = useAppDispatch();
    const { summary, trafficFlow, violationStats } = useAppSelector((s) => s.analytics);
    useEffect(() => {
        dispatch(fetchAnalyticsSummary());
        dispatch(fetchTrafficFlow());
        dispatch(fetchViolationAnalytics());
        dispatch(fetchAlerts({ page: 1, limit: 10 }));
        dispatch(fetchSignals());
    }, [dispatch]);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: "Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-dark-400", children: "Real-time overview of the traffic control system" })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [_jsx(StatCard, { title: "Vehicles Today", value: formatNumber(summary?.totalVehiclesToday ?? 0), icon: _jsx(TruckIcon, { className: "h-5 w-5" }), trend: { value: 12, label: 'vs yesterday' } }), _jsx(StatCard, { title: "Violations Today", value: formatNumber(summary?.totalViolationsToday ?? 0), icon: _jsx(ShieldExclamationIcon, { className: "h-5 w-5" }), trend: { value: -8, label: 'vs yesterday' } }), _jsx(StatCard, { title: "Active Cameras", value: `${summary?.activeCameras ?? 0}`, icon: _jsx(VideoCameraIcon, { className: "h-5 w-5" }) }), _jsx(StatCard, { title: "Online Signals", value: `${summary?.onlineSignals ?? 0}`, icon: _jsx(SignalIcon, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [_jsx(StatCard, { title: "Avg Speed", value: `${summary?.avgSpeedKmh?.toFixed(0) ?? 0} km/h`, icon: _jsx(BoltIcon, { className: "h-5 w-5" }) }), _jsx(StatCard, { title: "Lost Vehicles", value: `${summary?.lostVehiclesCount ?? 0}`, icon: _jsx(ExclamationTriangleIcon, { className: "h-5 w-5" }) }), _jsx(StatCard, { title: "Traffic Density", value: densityLabel(summary?.densityLevel ?? 'low') ?? 'Low', subtitle: "Current system-wide" })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsx(TrafficFlowChart, { data: trafficFlow }), _jsx(ViolationChart, { data: violationStats })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsx(AlertFeed, {}), _jsx(SignalStatusPanel, {})] })] }));
}
