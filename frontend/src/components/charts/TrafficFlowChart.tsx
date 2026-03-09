import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { TrafficFlowData } from '@/types';

interface Props {
  data: TrafficFlowData[];
}

export default function TrafficFlowChart({ data }: Props) {
  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Traffic Flow</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 12,
              color: '#f1f5f9',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          <Area
            type="monotone"
            dataKey="vehicleCount"
            name="Vehicles"
            stroke="#3b82f6"
            fill="url(#flowGrad)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="avgSpeed"
            name="Avg Speed (km/h)"
            stroke="#22c55e"
            fill="url(#speedGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
