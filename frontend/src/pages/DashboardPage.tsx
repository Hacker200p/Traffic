import { useEffect } from 'react';
import {
  TruckIcon,
  ShieldExclamationIcon,
  SignalIcon,
  VideoCameraIcon,
  ExclamationTriangleIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
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

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-dark-400">Real-time overview of the traffic control system</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Vehicles Today"
          value={formatNumber(summary?.totalVehiclesToday ?? 0)}
          icon={<TruckIcon className="h-5 w-5" />}
          trend={{ value: 12, label: 'vs yesterday' }}
        />
        <StatCard
          title="Violations Today"
          value={formatNumber(summary?.totalViolationsToday ?? 0)}
          icon={<ShieldExclamationIcon className="h-5 w-5" />}
          trend={{ value: -8, label: 'vs yesterday' }}
        />
        <StatCard
          title="Active Cameras"
          value={`${summary?.activeCameras ?? 0}`}
          icon={<VideoCameraIcon className="h-5 w-5" />}
        />
        <StatCard
          title="Online Signals"
          value={`${summary?.onlineSignals ?? 0}`}
          icon={<SignalIcon className="h-5 w-5" />}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Avg Speed"
          value={`${summary?.avgSpeedKmh?.toFixed(0) ?? 0} km/h`}
          icon={<BoltIcon className="h-5 w-5" />}
        />
        <StatCard
          title="Lost Vehicles"
          value={`${summary?.lostVehiclesCount ?? 0}`}
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
        />
        <StatCard
          title="Traffic Density"
          value={densityLabel(summary?.densityLevel ?? 'low') ?? 'Low'}
          subtitle="Current system-wide"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TrafficFlowChart data={trafficFlow} />
        <ViolationChart data={violationStats} />
      </div>

      {/* Alerts & Signals */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AlertFeed />
        <SignalStatusPanel />
      </div>
    </div>
  );
}
