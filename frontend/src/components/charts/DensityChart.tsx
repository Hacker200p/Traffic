import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { TimeSeriesPoint } from '@/types';
import { formatTime } from '@/utils/formatters';

interface Props {
  data: TimeSeriesPoint[];
  title?: string;
  color?: string;
}

export default function DensityChart({ data, title = 'Density Over Time', color = '#f97316' }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    time: formatTime(d.timestamp),
  }));

  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} />
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
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
