import { useAppSelector } from '@/store/hooks';
import { SIGNAL_COLORS } from '@/utils/constants';
import clsx from 'clsx';

export default function SignalStatusPanel() {
  const signals = useAppSelector((s) => s.signals.items);
  const online = signals.filter((s) => s.isOnline);

  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-5">
      <h3 className="mb-3 text-sm font-semibold text-white">
        Traffic Signals{' '}
        <span className="text-dark-500">({online.length}/{signals.length} online)</span>
      </h3>
      {signals.length === 0 ? (
        <p className="py-6 text-center text-xs text-dark-500">No signals loaded</p>
      ) : (
        <ul className="max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
          {signals.slice(0, 12).map((sig) => (
            <li
              key={sig.id}
              className="flex items-center justify-between rounded-lg bg-dark-700/30 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: SIGNAL_COLORS[sig.currentState] }}
                />
                <span className="text-sm text-dark-200">{sig.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {sig.remainingSeconds != null && (
                  <span className="font-mono text-xs text-dark-400">
                    {sig.remainingSeconds}s
                  </span>
                )}
                <span
                  className={clsx(
                    'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                    sig.isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
                  )}
                >
                  {sig.isOnline ? 'ON' : 'OFF'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
