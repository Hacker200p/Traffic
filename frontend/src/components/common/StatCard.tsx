import clsx from 'clsx';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
}

export default function StatCard({ title, value, subtitle, icon, trend, className }: Props) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-dark-700 bg-dark-800/50 p-5 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-dark-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-dark-500">{subtitle}</p>}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600/10 text-primary-400">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend.value >= 0 ? (
            <ArrowUpIcon className="h-3 w-3 text-emerald-400" />
          ) : (
            <ArrowDownIcon className="h-3 w-3 text-red-400" />
          )}
          <span className={trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {Math.abs(trend.value)}%
          </span>
          <span className="text-dark-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
