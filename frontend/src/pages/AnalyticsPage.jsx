import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    fetchAnalyticsSummary, fetchTrafficFlow, fetchViolationAnalytics,
    fetchDensityTimeline, fetchVehicleCountTimeline,
    fetchPeakHours, fetchAccidentZones, fetchMonthlyTrends, fetchVehicleTypes, fetchDensityZones,
} from '@/store/slices/analyticsSlice';
import TrafficFlowChart from '@/components/charts/TrafficFlowChart';
import ViolationChart from '@/components/charts/ViolationChart';
import DensityChart from '@/components/charts/DensityChart';
import VehicleTypeChart from '@/components/charts/VehicleTypeChart';
import PeakHoursChart from '@/components/charts/PeakHoursChart';
import MonthlyTrendChart from '@/components/charts/MonthlyTrendChart';
import ViolationStatsPanel from '@/components/charts/ViolationStatsPanel';
import TrafficMap from '@/components/map/TrafficMap';
import CongestionHeatmap from '@/components/map/CongestionHeatmap';
import AccidentZonesLayer from '@/components/map/AccidentZonesLayer';
import StatCard from '@/components/common/StatCard';
import { formatNumber } from '@/utils/formatters';
import { TruckIcon, ShieldExclamationIcon, BoltIcon, ExclamationTriangleIcon, } from '@heroicons/react/24/outline';

const RANGE_OPTIONS = [
    { label: 'Today', value: 'today', hours: 24 },
    { label: '7 Days', value: '7d', hours: 168 },
    { label: '30 Days', value: '30d', hours: 720 },
    { label: '90 Days', value: '90d', hours: 2160 },
];

export default function AnalyticsPage() {
    const dispatch = useAppDispatch();
    const {
        summary, trafficFlow, violationStats, densityTimeline,
        vehicleCountTimeline, peakHours, accidentZones,
        monthlyTrends, vehicleTypes, densityZones,
    } = useAppSelector((s) => s.analytics);
    const [range, setRange] = useState('7d');

    const rangeHours = RANGE_OPTIONS.find(o => o.value === range)?.hours ?? 168;

    useEffect(() => {
        dispatch(fetchAnalyticsSummary());
        dispatch(fetchTrafficFlow({ hours: rangeHours }));
        dispatch(fetchViolationAnalytics({ hours: rangeHours }));
        dispatch(fetchDensityTimeline({ hours: rangeHours }));
        dispatch(fetchVehicleCountTimeline({ hours: rangeHours }));
        dispatch(fetchPeakHours({ days: Math.ceil(rangeHours / 24) }));
        dispatch(fetchAccidentZones({ days: Math.max(90, Math.ceil(rangeHours / 24)) }));
        dispatch(fetchMonthlyTrends({ months: 12 }));
        dispatch(fetchVehicleTypes());
        dispatch(fetchDensityZones());
    }, [dispatch, range, rangeHours]);

    const [mapLayer, setMapLayer] = useState('congestion'); // 'congestion' | 'accidents'

    return (_jsxs("div", { className: "space-y-6", children: [
        /* ── Header + Range Selector ───────────────────────────────────── */
        _jsxs("div", { className: "flex items-center justify-between", children: [
            _jsxs("div", { children: [
                _jsx("h1", { className: "text-2xl font-bold text-white", children: "Analytics & Reports" }),
                _jsx("p", { className: "mt-1 text-sm text-dark-400", children: "In-depth traffic analysis, trend reports, and actionable insights" }),
            ] }),
            _jsx("div", { className: "flex gap-1 rounded-lg border border-dark-700 bg-dark-800 p-1", children:
                RANGE_OPTIONS.map((opt) => (
                    _jsx("button", { onClick: () => setRange(opt.value), className: `rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${range === opt.value ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`, children: opt.label }, opt.value)
                ))
            }),
        ] }),

        /* ── Summary Stat Cards ────────────────────────────────────────── */
        _jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
            _jsx(StatCard, { title: "Total Vehicles", value: formatNumber(summary?.totalVehiclesToday ?? 0), icon: _jsx(TruckIcon, { className: "h-5 w-5" }) }),
            _jsx(StatCard, { title: "Total Violations", value: formatNumber(summary?.totalViolationsToday ?? 0), icon: _jsx(ShieldExclamationIcon, { className: "h-5 w-5" }) }),
            _jsx(StatCard, { title: "Average Speed", value: `${summary?.avgSpeedKmh?.toFixed(0) ?? 0} km/h`, icon: _jsx(BoltIcon, { className: "h-5 w-5" }) }),
            _jsx(StatCard, { title: "Accident Zones", value: `${accidentZones.length}`, icon: _jsx(ExclamationTriangleIcon, { className: "h-5 w-5" }) }),
        ] }),

        /* ── Traffic Flow + Violation Bar Chart ────────────────────────── */
        _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [
            _jsx(TrafficFlowChart, { data: trafficFlow }),
            _jsx(ViolationChart, { data: violationStats }),
        ] }),

        /* ── Peak Traffic Hours Heatmap ────────────────────────────────── */
        peakHours.length > 0 && _jsx(PeakHoursChart, { data: peakHours }),

        /* ── Congestion / Accident Map ─────────────────────────────────── */
        _jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [
            _jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
                _jsx("h3", { className: "text-sm font-semibold text-white", children: mapLayer === 'congestion' ? 'Congestion Heatmap' : 'Accident-Prone Zones' }),
                _jsx("div", { className: "flex gap-1 rounded-lg border border-dark-700 bg-dark-900 p-0.5", children: [
                    { label: 'Congestion', value: 'congestion' },
                    { label: 'Accidents', value: 'accidents' },
                ].map(opt => (
                    _jsx("button", { onClick: () => setMapLayer(opt.value), className: `rounded-md px-3 py-1 text-xs font-medium transition-colors ${mapLayer === opt.value ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`, children: opt.label }, opt.value)
                )) }),
            ] }),
            _jsx("div", { className: "h-[350px] overflow-hidden rounded-lg", children:
                _jsxs(TrafficMap, { className: "h-full w-full", children: [
                    mapLayer === 'congestion' && densityZones.length > 0 && _jsx(CongestionHeatmap, { zones: densityZones }),
                    mapLayer === 'accidents' && accidentZones.length > 0 && _jsx(AccidentZonesLayer, { zones: accidentZones }),
                ] })
            }),
        ] }),

        /* ── Violation Breakdown + Vehicle Types ───────────────────────── */
        _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [
            _jsx(ViolationStatsPanel, { data: violationStats }),
            _jsx(VehicleTypeChart, { data: vehicleTypes.length > 0 ? vehicleTypes : [{ name: 'No data', value: 1 }] }),
        ] }),

        /* ── Monthly Trends ────────────────────────────────────────────── */
        monthlyTrends.length > 0 && _jsx(MonthlyTrendChart, { data: monthlyTrends }),

        /* ── Density + Vehicle Count Timelines ─────────────────────────── */
        _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [
            _jsx(DensityChart, { data: densityTimeline, title: "Density Over Time", color: "#f97316" }),
            _jsx(DensityChart, { data: vehicleCountTimeline, title: "Vehicle Count Over Time", color: "#3b82f6" }),
        ] }),
    ] }));
}
