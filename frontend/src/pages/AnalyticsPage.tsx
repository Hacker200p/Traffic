import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchAnalyticsSummary,
  fetchTrafficFlow,
  fetchViolationAnalytics,
  fetchDensityTimeline,
  fetchVehicleCountTimeline,
} from '@/store/slices/analyticsSlice';
import TrafficFlowChart from '@/components/charts/TrafficFlowChart';
import ViolationChart from '@/components/charts/ViolationChart';
import DensityChart from '@/components/charts/DensityChart';
import VehicleTypeChart from '@/components/charts/VehicleTypeChart';
import StatCard from '@/components/common/StatCard';
import { formatNumber } from '@/utils/formatters';
import {
  TruckIcon,
  ShieldExclamationIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

const RANGE_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];

export default function AnalyticsPage() {
  const dispatch = useAppDispatch();
  const {
    summary,
    trafficFlow,
    violationStats,
    densityTimeline,
    vehicleCountTimeline,
  } = useAppSelector((s) => s.analytics);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="mt-1 text-sm text-dark-400">In-depth traffic analysis and insights</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-dark-700 bg-dark-800 p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                range === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Vehicles"
          value={formatNumber(summary?.totalVehiclesToday ?? 0)}
          icon={<TruckIcon className="h-5 w-5" />}
        />
        <StatCard
          title="Total Violations"
          value={formatNumber(summary?.totalViolationsToday ?? 0)}
          icon={<ShieldExclamationIcon className="h-5 w-5" />}
        />
        <StatCard
          title="Average Speed"
          value={`${summary?.avgSpeedKmh?.toFixed(0) ?? 0} km/h`}
          icon={<BoltIcon className="h-5 w-5" />}
        />
      </div>

      {/* Row 1 – Flow + Violations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TrafficFlowChart data={trafficFlow} />
        <ViolationChart data={violationStats} />
      </div>

      {/* Row 2 – Density + Vehicle types */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DensityChart
          data={densityTimeline}
          title="Density Over Time"
          color="#f97316"
        />
        <VehicleTypeChart data={vehicleTypeData} />
      </div>

      {/* Row 3 – Vehicle count timeline */}
      <DensityChart
        data={vehicleCountTimeline}
        title="Vehicle Count Over Time"
        color="#3b82f6"
      />
    </div>
  );
}
