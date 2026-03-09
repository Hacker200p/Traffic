import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAnalyticsSummary, fetchTrafficFlow, fetchViolationAnalytics, fetchDensityTimeline, fetchVehicleCountTimeline, } from '@/store/slices/analyticsSlice';
import TrafficFlowChart from '@/components/charts/TrafficFlowChart';
import ViolationChart from '@/components/charts/ViolationChart';
import DensityChart from '@/components/charts/DensityChart';
import VehicleTypeChart from '@/components/charts/VehicleTypeChart';
import StatCard from '@/components/common/StatCard';
import { formatNumber } from '@/utils/formatters';
import { TruckIcon, ShieldExclamationIcon, BoltIcon, } from '@heroicons/react/24/outline';
const RANGE_OPTIONS = [
    { label: 'Today', value: 'today' },
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
];
export default function AnalyticsPage() {
    const dispatch = useAppDispatch();
    const { summary, trafficFlow, violationStats, densityTimeline, vehicleCountTimeline, } = useAppSelector((s) => s.analytics);
    const [range, setRange] = useState('7d');
    useEffect(() => {
        dispatch(fetchAnalyticsSummary());
        dispatch(fetchTrafficFlow({ interval: range }));
        dispatch(fetchViolationAnalytics());
        dispatch(fetchDensityTimeline());
        dispatch(fetchVehicleCountTimeline());
    }, [dispatch, range]);
    // Sample vehicle-type breakdown from summary (normally a separate endpoint)
    const vehicleTypeData = [
        { name: 'Car', value: 64 },
        { name: 'Motorcycle', value: 18 },
        { name: 'Bus', value: 8 },
        { name: 'Truck', value: 7 },
        { name: 'Bicycle', value: 3 },
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: "Analytics" }), _jsx("p", { className: "mt-1 text-sm text-dark-400", children: "In-depth traffic analysis and insights" })] }), _jsx("div", { className: "flex gap-1 rounded-lg border border-dark-700 bg-dark-800 p-1", children: RANGE_OPTIONS.map((opt) => (_jsx("button", { onClick: () => setRange(opt.value), className: `rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${range === opt.value
                                ? 'bg-primary-600 text-white'
                                : 'text-dark-400 hover:text-white'}`, children: opt.label }, opt.value))) })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [_jsx(StatCard, { title: "Total Vehicles", value: formatNumber(summary?.totalVehiclesToday ?? 0), icon: _jsx(TruckIcon, { className: "h-5 w-5" }) }), _jsx(StatCard, { title: "Total Violations", value: formatNumber(summary?.totalViolationsToday ?? 0), icon: _jsx(ShieldExclamationIcon, { className: "h-5 w-5" }) }), _jsx(StatCard, { title: "Average Speed", value: `${summary?.avgSpeedKmh?.toFixed(0) ?? 0} km/h`, icon: _jsx(BoltIcon, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsx(TrafficFlowChart, { data: trafficFlow }), _jsx(ViolationChart, { data: violationStats })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsx(DensityChart, { data: densityTimeline, title: "Density Over Time", color: "#f97316" }), _jsx(VehicleTypeChart, { data: vehicleTypeData })] }), _jsx(DensityChart, { data: vehicleCountTimeline, title: "Vehicle Count Over Time", color: "#3b82f6" })] }));
}
