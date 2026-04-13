import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSignals } from '@/store/slices/signalSlice';
import { fetchLostVehicles } from '@/store/slices/vehicleSlice';
import { challansApi } from '@/api/challans.api';
import { signalsApi } from '@/api/signals.api';
import { vehiclesApi } from '@/api/vehicles.api';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDateTime, formatNumber, timeAgo, violationLabel } from '@/utils/formatters';
import { SIGNAL_COLORS } from '@/utils/constants';
import {
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    BanknotesIcon,
    SignalIcon,
    MapIcon,
    ChartBarIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function AdminControlPanel() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { items: signals } = useAppSelector((s) => s.signals);
    const { lostVehicles } = useAppSelector((s) => s.vehicles);

    // Local state
    const [pendingChallans, setPendingChallans] = useState([]);
    const [challanStats, setChallanStats] = useState(null);
    const [activeOverrides, setActiveOverrides] = useState([]);
    const [loadingChallans, setLoadingChallans] = useState(true);
    const [loadingOverrides, setLoadingOverrides] = useState(true);
    const [stolenPlate, setStolenPlate] = useState('');
    const [markingStolen, setMarkingStolen] = useState(false);

    // Signal override form
    const [overrideSignalId, setOverrideSignalId] = useState('');
    const [overrideState, setOverrideState] = useState('red');
    const [overrideDuration, setOverrideDuration] = useState(15);
    const [overrideReason, setOverrideReason] = useState('');
    const [submittingOverride, setSubmittingOverride] = useState(false);

    const loadPendingChallans = useCallback(async () => {
        setLoadingChallans(true);
        const [pendingResult, statsResult] = await Promise.allSettled([
            challansApi.getPending({ limit: 10 }),
            challansApi.getStats(),
        ]);

        if (pendingResult.status === 'fulfilled') {
            setPendingChallans(pendingResult.value.data.data || []);
        } else {
            setPendingChallans([]);
        }

        if (statsResult.status === 'fulfilled') {
            setChallanStats(statsResult.value.data.data || null);
        } else {
            setChallanStats(null);
        }

        const pendingStatus = pendingResult.status === 'rejected'
            ? pendingResult.reason?.response?.status
            : null;

        // Do not show a hard error when pending list is forbidden for non-admin roles
        // but stats can still be displayed.
        const shouldToast =
            (statsResult.status === 'rejected') ||
            (pendingResult.status === 'rejected' && pendingStatus !== 403);

        if (shouldToast) {
            toast.error('Failed to load challan data');
        }

        setLoadingChallans(false);
    }, []);

    const loadActiveOverrides = useCallback(async () => {
        setLoadingOverrides(true);
        try {
            const { data } = await signalsApi.getActiveOverrides();
            setActiveOverrides(data.data || []);
        } catch {
            setActiveOverrides([]);
        } finally {
            setLoadingOverrides(false);
        }
    }, []);

    useEffect(() => {
        dispatch(fetchSignals());
        dispatch(fetchLostVehicles({ page: 1, limit: 100 }));
        loadPendingChallans();
        loadActiveOverrides();
    }, [dispatch, loadPendingChallans, loadActiveOverrides]);

    // ── Challan Actions ──
    const handleApproveChallan = async (id) => {
        try {
            await challansApi.approve(id, {});
            toast.success('Challan approved & notification sent');
            loadPendingChallans();
        } catch {
            toast.error('Failed to approve challan');
        }
    };

    const handleRejectChallan = async (id) => {
        const reason = prompt('Reason for rejection:');
        if (!reason) return;
        try {
            await challansApi.reject(id, reason);
            toast.success('Challan rejected');
            loadPendingChallans();
        } catch {
            toast.error('Failed to reject challan');
        }
    };

    // ── Mark Stolen ──
    const handleMarkStolen = async () => {
        if (!stolenPlate.trim()) return;
        setMarkingStolen(true);
        try {
            const { data } = await vehiclesApi.findByPlate(stolenPlate.trim());
            const vehicle = data.data;
            if (vehicle.is_blacklisted) {
                toast.error('Vehicle is already marked as stolen');
                setMarkingStolen(false);
                return;
            }
            await vehiclesApi.reportLost(vehicle.id, { notes: 'Marked stolen via Admin Panel' });
            toast.success(`${stolenPlate} marked as stolen`);
            setStolenPlate('');
            dispatch(fetchLostVehicles({ page: 1, limit: 100 }));
        } catch {
            toast.error('Vehicle not found or failed to update');
        } finally {
            setMarkingStolen(false);
        }
    };

    const handleMarkRecovered = async (id) => {
        try {
            await vehiclesApi.markFound(id);
            toast.success('Vehicle marked as recovered');
            dispatch(fetchLostVehicles({ page: 1, limit: 100 }));
        } catch {
            toast.error('Failed to mark vehicle as recovered');
        }
    };

    // ── Signal Override ──
    const handleSignalOverride = async (e) => {
        e.preventDefault();
        if (!overrideSignalId) return;
        setSubmittingOverride(true);
        try {
            const overrideUntil = new Date(Date.now() + overrideDuration * 60 * 1000).toISOString();
            await signalsApi.updateState(overrideSignalId, {
                state: overrideState,
                reason: overrideReason || 'Manual override via Admin Panel',
                overrideUntil,
            });
            toast.success('Signal override applied');
            setOverrideSignalId('');
            setOverrideReason('');
            dispatch(fetchSignals());
            loadActiveOverrides();
        } catch {
            toast.error('Failed to override signal');
        } finally {
            setSubmittingOverride(false);
        }
    };

    const onlineSignals = signals.filter((s) => s.isOnline).length;

    return (
        _jsxs("div", { className: "space-y-6", children: [
            // ── Header ──
            _jsxs("div", { children: [
                _jsx("h1", { className: "text-2xl font-bold text-white", children: "Admin Control Panel" }),
                _jsx("p", { className: "mt-1 text-sm text-dark-400", children: "Centralized command center for traffic management operations" }),
            ] }),

            // ── Overview Stats ──
            _jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
                _jsx(StatCard, {
                    title: "Pending Fines",
                    value: challanStats?.pending_approval ?? '—',
                    subtitle: `${challanStats?.total ?? 0} total challans`,
                    icon: _jsx(BanknotesIcon, { className: "h-5 w-5" }),
                }),
                _jsx(StatCard, {
                    title: "Active Overrides",
                    value: activeOverrides.length,
                    subtitle: `${onlineSignals} signals online`,
                    icon: _jsx(SignalIcon, { className: "h-5 w-5" }),
                }),
                _jsx(StatCard, {
                    title: "Stolen Vehicles",
                    value: lostVehicles.length,
                    subtitle: "Active reports",
                    icon: _jsx(ExclamationTriangleIcon, { className: "h-5 w-5" }),
                }),
                _jsx(StatCard, {
                    title: "Fines Collected",
                    value: challanStats ? `${formatNumber(challanStats.collected_fines)}` : '—',
                    subtitle: `of ${formatNumber(challanStats?.total_fines ?? 0)} total`,
                    icon: _jsx(ShieldCheckIcon, { className: "h-5 w-5" }),
                }),
            ] }),

            // ── Quick Navigation ──
            _jsx("div", { className: "grid gap-3 sm:grid-cols-4", children: [
                { label: 'Live Map', icon: MapIcon, path: '/map' },
                { label: 'Analytics', icon: ChartBarIcon, path: '/analytics' },
                { label: 'Lost Vehicles', icon: MagnifyingGlassIcon, path: '/lost-vehicles' },
                { label: 'Violations', icon: ShieldCheckIcon, path: '/violations' },
            ].map((item) => (
                _jsxs("button", {
                    onClick: () => navigate(item.path),
                    className: "flex items-center gap-3 rounded-xl border border-dark-700 bg-dark-800/50 p-4 text-left transition-colors hover:border-primary-600/30 hover:bg-dark-700",
                    children: [
                        _jsx(item.icon, { className: "h-5 w-5 text-primary-400" }),
                        _jsx("span", { className: "text-sm font-medium text-white", children: item.label }),
                    ],
                }, item.label)
            )) }),

            // ── Main Grid ──
            _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [

                // ── Pending Challans (Fine Approval) ──
                _jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [
                    _jsxs("div", { className: "mb-4 flex items-center justify-between", children: [
                        _jsxs("h2", { className: "text-lg font-semibold text-white flex items-center gap-2", children: [
                            _jsx(BanknotesIcon, { className: "h-5 w-5 text-yellow-400" }),
                            "Pending Fine Approval",
                        ] }),
                        pendingChallans.length > 0 && _jsx("span", {
                            className: "rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-400",
                            children: pendingChallans.length,
                        }),
                    ] }),
                    loadingChallans
                        ? _jsx("div", { className: "flex h-32 items-center justify-center", children:
                            _jsx("div", { className: "h-6 w-6 animate-spin rounded-full border-2 border-dark-600 border-t-primary-500" })
                        })
                        : pendingChallans.length === 0
                            ? _jsx("p", { className: "py-8 text-center text-sm text-dark-500", children: "No challans pending approval" })
                            : _jsx("div", { className: "space-y-3 max-h-[400px] overflow-y-auto", children:
                                pendingChallans.map((ch) => (
                                    _jsxs("div", {
                                        className: "rounded-lg border border-dark-700 bg-dark-900/50 p-3",
                                        children: [
                                            _jsxs("div", { className: "flex items-center justify-between", children: [
                                                _jsxs("div", { children: [
                                                    _jsx("span", { className: "font-mono text-xs text-dark-300", children: ch.challan_number }),
                                                    _jsx("span", { className: "ml-2 text-xs text-dark-500", children: ch.plate_number }),
                                                ] }),
                                                _jsx(StatusBadge, { label: violationLabel(ch.violation_type) ?? ch.violation_type, variant: "warning" }),
                                            ] }),
                                            _jsxs("div", { className: "mt-2 flex items-center justify-between", children: [
                                                _jsxs("div", { className: "text-xs text-dark-400 space-y-0.5", children: [
                                                    _jsxs("p", { children: ["Fine: ", _jsxs("span", { className: "font-semibold text-white", children: ["EGP ", formatNumber(ch.fine_amount)] })] }),
                                                    _jsxs("p", { children: ["Owner: ", ch.owner_name || '—'] }),
                                                    _jsxs("p", { children: [timeAgo(ch.created_at)] }),
                                                ] }),
                                                _jsxs("div", { className: "flex gap-2", children: [
                                                    _jsxs("button", {
                                                        onClick: () => handleApproveChallan(ch.id),
                                                        className: "flex items-center gap-1 rounded-lg bg-emerald-600/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-600/20",
                                                        children: [
                                                            _jsx(CheckCircleIcon, { className: "h-3.5 w-3.5" }),
                                                            "Approve",
                                                        ],
                                                    }),
                                                    _jsxs("button", {
                                                        onClick: () => handleRejectChallan(ch.id),
                                                        className: "flex items-center gap-1 rounded-lg bg-red-600/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/20",
                                                        children: [
                                                            _jsx(XCircleIcon, { className: "h-3.5 w-3.5" }),
                                                            "Reject",
                                                        ],
                                                    }),
                                                ] }),
                                            ] }),
                                        ],
                                    }, ch.id)
                                ))
                            }),
                ] }),

                // ── Signal Override ──
                _jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [
                    _jsxs("h2", { className: "mb-4 text-lg font-semibold text-white flex items-center gap-2", children: [
                        _jsx(SignalIcon, { className: "h-5 w-5 text-blue-400" }),
                        "Signal Override Control",
                    ] }),
                    _jsxs("form", { onSubmit: handleSignalOverride, className: "space-y-3", children: [
                        _jsxs("div", { children: [
                            _jsx("label", { className: "text-xs font-medium text-dark-400", children: "Select Signal" }),
                            _jsx("select", {
                                value: overrideSignalId,
                                onChange: (e) => setOverrideSignalId(e.target.value),
                                className: "mt-1 w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-white outline-none focus:border-primary-500",
                                children: [
                                    _jsx("option", { value: "", children: "Choose a signal..." }),
                                    ...signals.filter((s) => s.isOnline).map((s) => (
                                        _jsx("option", { value: s.id, children: `${s.name}${s.intersectionName ? ` — ${s.intersectionName}` : ''}` }, s.id)
                                    )),
                                ],
                            }),
                        ] }),
                        _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                            _jsxs("div", { children: [
                                _jsx("label", { className: "text-xs font-medium text-dark-400", children: "State" }),
                                _jsxs("select", {
                                    value: overrideState,
                                    onChange: (e) => setOverrideState(e.target.value),
                                    className: "mt-1 w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-white outline-none focus:border-primary-500",
                                    children: [
                                        _jsx("option", { value: "red", children: "Red" }),
                                        _jsx("option", { value: "green", children: "Green" }),
                                        _jsx("option", { value: "yellow", children: "Yellow" }),
                                        _jsx("option", { value: "flashing_red", children: "Flashing Red" }),
                                        _jsx("option", { value: "flashing_yellow", children: "Flashing Yellow" }),
                                        _jsx("option", { value: "off", children: "Off" }),
                                    ],
                                }),
                            ] }),
                            _jsxs("div", { children: [
                                _jsx("label", { className: "text-xs font-medium text-dark-400", children: "Duration (min)" }),
                                _jsx("input", {
                                    type: "number",
                                    min: 1,
                                    max: 480,
                                    value: overrideDuration,
                                    onChange: (e) => setOverrideDuration(parseInt(e.target.value, 10) || 15),
                                    className: "mt-1 w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-white outline-none focus:border-primary-500",
                                }),
                            ] }),
                        ] }),
                        _jsxs("div", { children: [
                            _jsx("label", { className: "text-xs font-medium text-dark-400", children: "Reason" }),
                            _jsx("input", {
                                type: "text",
                                value: overrideReason,
                                onChange: (e) => setOverrideReason(e.target.value),
                                placeholder: "e.g. Emergency, Accident, Congestion...",
                                className: "mt-1 w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-white placeholder-dark-500 outline-none focus:border-primary-500",
                            }),
                        ] }),
                        _jsx("button", {
                            type: "submit",
                            disabled: !overrideSignalId || submittingOverride,
                            className: "w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50",
                            children: submittingOverride ? 'Applying...' : 'Apply Override',
                        }),
                    ] }),

                    // Active overrides list
                    activeOverrides.length > 0 && _jsxs("div", { className: "mt-4 border-t border-dark-700 pt-4", children: [
                        _jsxs("h3", { className: "mb-2 text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-1", children: [
                            _jsx(ClockIcon, { className: "h-3.5 w-3.5" }),
                            "Active Overrides",
                        ] }),
                        _jsx("div", { className: "space-y-2", children:
                            activeOverrides.map((ov) => (
                                _jsxs("div", {
                                    className: "flex items-center justify-between rounded-lg bg-dark-900/50 p-2.5",
                                    children: [
                                        _jsxs("div", { className: "flex items-center gap-2", children: [
                                            _jsx("div", {
                                                className: "h-3 w-3 rounded-full",
                                                style: { backgroundColor: SIGNAL_COLORS[ov.current_state] || '#6b7280' },
                                            }),
                                            _jsxs("div", { children: [
                                                _jsx("p", { className: "text-xs font-medium text-white", children: ov.name }),
                                                _jsx("p", { className: "text-[10px] text-dark-500", children: ov.reason || 'No reason' }),
                                            ] }),
                                        ] }),
                                        _jsxs("div", { className: "text-right text-[10px] text-dark-400", children: [
                                            _jsxs("p", { children: ["Until: ", formatDateTime(ov.override_until)] }),
                                            ov.changed_by_name && _jsxs("p", { children: ["By: ", ov.changed_by_name] }),
                                        ] }),
                                    ],
                                }, ov.id)
                            ))
                        }),
                    ] }),
                ] }),

                // ── Stolen Vehicle Management ──
                _jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [
                    _jsxs("h2", { className: "mb-4 text-lg font-semibold text-white flex items-center gap-2", children: [
                        _jsx(ExclamationTriangleIcon, { className: "h-5 w-5 text-red-400" }),
                        "Stolen Vehicle Management",
                    ] }),

                    // Mark as stolen form
                    _jsxs("div", { className: "mb-4 flex gap-2", children: [
                        _jsx("input", {
                            type: "text",
                            value: stolenPlate,
                            onChange: (e) => setStolenPlate(e.target.value.toUpperCase()),
                            placeholder: "Enter plate number...",
                            className: "flex-1 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm font-mono text-white placeholder-dark-500 outline-none focus:border-red-500",
                        }),
                        _jsx("button", {
                            onClick: handleMarkStolen,
                            disabled: !stolenPlate.trim() || markingStolen,
                            className: "rounded-lg bg-red-600/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50",
                            children: markingStolen ? 'Searching...' : 'Mark Stolen',
                        }),
                    ] }),

                    // Active stolen vehicles
                    lostVehicles.length === 0
                        ? _jsx("p", { className: "py-4 text-center text-sm text-dark-500", children: "No stolen vehicles on record" })
                        : _jsx("div", { className: "space-y-2 max-h-[280px] overflow-y-auto", children:
                            lostVehicles.slice(0, 15).map((v) => (
                                _jsxs("div", {
                                    className: "flex items-center justify-between rounded-lg bg-dark-900/50 p-2.5",
                                    children: [
                                        _jsxs("div", { children: [
                                            _jsx("span", { className: "font-mono text-sm font-semibold text-red-400", children: v.plateNumber }),
                                            _jsxs("span", { className: "ml-2 text-xs text-dark-500", children: [v.type, " · ", v.make, " ", v.model].filter(Boolean).join('') }),
                                        ] }),
                                        _jsx("button", {
                                            onClick: () => handleMarkRecovered(v.id),
                                            className: "rounded-lg bg-emerald-600/10 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-600/20",
                                            children: "Recovered",
                                        }),
                                    ],
                                }, v.id)
                            ))
                        }),
                ] }),

                // ── Challan Statistics ──
                _jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800/50 p-5", children: [
                    _jsxs("h2", { className: "mb-4 text-lg font-semibold text-white flex items-center gap-2", children: [
                        _jsx(ChartBarIcon, { className: "h-5 w-5 text-purple-400" }),
                        "Fine Statistics",
                    ] }),
                    challanStats
                        ? _jsx("div", { className: "grid grid-cols-2 gap-3", children: [
                            { label: 'Pending Approval', value: challanStats.pending_approval, color: 'text-yellow-400' },
                            { label: 'Issued', value: challanStats.issued, color: 'text-blue-400' },
                            { label: 'Sent', value: challanStats.sent, color: 'text-purple-400' },
                            { label: 'Paid', value: challanStats.paid, color: 'text-emerald-400' },
                            { label: 'Overdue', value: challanStats.overdue, color: 'text-red-400' },
                            { label: 'Rejected', value: challanStats.rejected, color: 'text-dark-400' },
                        ].map((item) => (
                            _jsxs("div", {
                                className: "rounded-lg bg-dark-900/50 p-3",
                                children: [
                                    _jsx("p", { className: "text-xs text-dark-500", children: item.label }),
                                    _jsx("p", { className: clsx("text-xl font-bold", item.color), children: item.value ?? 0 }),
                                ],
                            }, item.label)
                        )) })
                        : _jsx("div", { className: "flex h-32 items-center justify-center", children:
                            _jsx("div", { className: "h-6 w-6 animate-spin rounded-full border-2 border-dark-600 border-t-primary-500" })
                        }),
                ] }),

            ] }),
        ] })
    );
}
