import { useAppSelector } from '@/store/hooks';
import { timeAgo } from '@/utils/formatters';
import clsx from 'clsx';

export default function AlertFeed() {
  const alerts = useAppSelector((s) => s.alerts.items);
  const recent = alerts.slice(0, 8);

  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-5">
      <h3 className="mb-3 text-sm font-semibold text-white">Recent Alerts</h3>
      {recent.length === 0 ? (
        <p className="py-6 text-center text-xs text-dark-500">No recent alerts</p>
      ) : (
        <ul className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
          {recent.map((a) => (
            <li
              key={a.id}
              className={clsx(
                'rounded-lg border px-3 py-2 transition-colors',
                a.isRead ? 'border-dark-700/50 bg-dark-800/30' : 'border-dark-600 bg-dark-700/40',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={clsx('h-2 w-2 flex-shrink-0 rounded-full', {
                    'bg-red-500': a.priority === 'critical',
                    'bg-yellow-500': a.priority === 'warning',
                    'bg-blue-500': a.priority === 'info',
                  })}
                />
                <p className="truncate text-sm font-medium text-white">{a.title}</p>
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs text-dark-400">{a.message}</p>
              <p className="mt-1 text-[10px] text-dark-500">{timeAgo(a.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
