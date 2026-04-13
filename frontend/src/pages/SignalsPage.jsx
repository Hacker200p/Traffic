import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSignals } from '@/store/slices/signalSlice';
import { signalsApi } from '@/api/signals.api';
import { SIGNAL_COLORS } from '@/utils/constants';
import { signalLabel, timeAgo } from '@/utils/formatters';
import RoleGate from '@/components/auth/RoleGate';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function SignalsPage() {
    const dispatch = useAppDispatch();
    const { items, loading } = useAppSelector((s) => s.signals);

    useEffect(() => {
        dispatch(fetchSignals());
    }, [dispatch]);

    const handleMode = async (id, mode) => {
        try {
            await signalsApi.setMode(id, mode);
            toast.success(`Signal set to ${mode}`);
            dispatch(fetchSignals());
        } catch {
            toast.error('Failed to update signal mode');
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-dark-600 border-t-primary-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Traffic Signals</h1>
                <p className="mt-1 text-sm text-dark-400">
                    {items.filter((s) => s.isOnline).length} of {items.length} signals online
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((sig) => {
                    const isAutoActive = sig.isAutonomous;
                    const isManualActive = !sig.isAutonomous && sig.currentState !== 'red';
                    const isEmergencyActive = !sig.isAutonomous && sig.currentState === 'red';

                    return (
                        <div
                            key={sig.id}
                            className="rounded-xl border border-dark-700 bg-dark-800/50 p-5 transition-colors hover:border-dark-600"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="h-4 w-4 rounded-full shadow-lg"
                                        style={{
                                            backgroundColor: SIGNAL_COLORS[sig.currentState],
                                            boxShadow: `0 0 12px ${SIGNAL_COLORS[sig.currentState]}60`,
                                        }}
                                    />
                                    <h3 className="text-sm font-semibold text-white">{sig.name}</h3>
                                </div>
                                <span
                                    className={clsx(
                                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                        sig.isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
                                    )}
                                >
                                    {sig.isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>

                            <div className="mt-3 space-y-1 text-xs text-dark-400">
                                <p>
                                    State: <span className="font-medium text-dark-200">{signalLabel(sig.currentState)}</span>
                                </p>
                                {sig.remainingSeconds != null && (
                                    <p>
                                        Remaining: <span className="font-mono text-dark-200">{sig.remainingSeconds}s</span>
                                    </p>
                                )}
                                <p>
                                    Mode: <span className="font-medium text-dark-200 capitalize">{sig.isAutonomous ? 'auto' : 'manual'}</span>
                                </p>
                                {sig.intersectionName && <p>Intersection: {sig.intersectionName}</p>}
                                <p>
                                    Updated: <span className="font-medium text-dark-200">{timeAgo(sig.lastStateChange || sig.updatedAt)}</span>
                                </p>
                            </div>

                            <RoleGate roles={[ 'admin' ]}>
                                <div className="mt-4 flex gap-1">
                                    {['auto', 'manual', 'emergency'].map((mode) => {
                                        const activeClass =
                                            mode === 'auto'
                                                ? isAutoActive
                                                : mode === 'manual'
                                                    ? isManualActive
                                                    : isEmergencyActive;

                                        return (
                                            <button
                                                key={mode}
                                                onClick={() => handleMode(sig.id, mode)}
                                                className={clsx(
                                                    'rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors',
                                                    activeClass
                                                        ? mode === 'emergency'
                                                            ? 'bg-red-600 text-white'
                                                            : 'bg-primary-600 text-white'
                                                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600 hover:text-white',
                                                )}
                                            >
                                                {mode}
                                            </button>
                                        );
                                    })}
                                </div>
                            </RoleGate>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
