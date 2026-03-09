import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { ViolationStats } from '@/types';
import { violationLabel } from '@/utils/formatters';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];

interface Props {
  data: ViolationStats[];
}

export default function ViolationChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: violationLabel(d.type) ?? d.type,
  }));

  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Violations by Type</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
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
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {formatted.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
