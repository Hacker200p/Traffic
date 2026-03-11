import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAccidents, fetchAccidentStats, updateAccidentStatus } from '@/store/slices/accidentSlice';
import { ExclamationTriangleIcon, MapPinIcon, TruckIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const severityColors = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-dark-900',
    low: 'bg-blue-500 text-white',
};

const statusColors = {
    detected: 'bg-red-500/20 text-red-400 border-red-500/30',
    confirmed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    dispatched: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
    false_alarm: 'bg-dark-600/50 text-dark-400 border-dark-500/30',
};

const detectionTypeLabels = {
    sudden_stop: 'Sudden Stop',
    collision: 'Collision',
    unusual_motion: 'Unusual Motion',
    manual_report: 'Manual Report',
};

export default function AccidentDetectionPage() {
    const dispatch = useAppDispatch();
    const { items: accidents, stats, loading } = useAppSelector((state) => state.accidents);
    const [filter, setFilter] = useState({ status: '', severity: '' });
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        dispatch(fetchAccidents({ page: 1, limit: 50, ...filter }));
        dispatch(fetchAccidentStats());
    }, [dispatch, filter]);

    const handleStatusUpdate = useCallback(async (id, status, resolutionNotes) => {
        setUpdatingId(id);
        try {
            await dispatch(updateAccidentStatus({ id, body: { status, resolutionNotes } })).unwrap();
            toast.success(`Accident marked as ${status.replace(/_/g, ' ')}`);
            dispatch(fetchAccidentStats());
        } catch {
            toast.error('Failed to update accident status');
        } finally {
            setUpdatingId(null);
        }
    }, [dispatch]);

    return _jsxs("div", {
        className: "space-y-6",
        children: [
            // Header
            _jsxs("div", {
                className: "flex items-center justify-between",
                children: [
                    _jsxs("div", {
                        children: [
                            _jsx("h1", { className: "text-2xl font-bold text-white", children: "Accident Detection" }),
                            _jsx("p", { className: "text-dark-400 mt-1", children: "Real-time accident monitoring — sudden stops, collisions, and unusual motion patterns" }),
                        ]
                    }),
                    _jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                            _jsx("div", {
                                className: "h-3 w-3 rounded-full bg-green-500 animate-pulse"
                            }),
                            _jsx("span", { className: "text-sm text-dark-400", children: "Live Monitoring" }),
                        ]
                    }),
                ]
            }),

            // Stats cards
            stats && _jsxs("div", {
                className: "grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5",
                children: [
                    _jsx(StatCard, { label: "Last 24h", value: stats.last_24h || 0, icon: ClockIcon, color: "text-blue-400" }),
                    _jsx(StatCard, { label: "Detected", value: stats.detected || 0, icon: ExclamationTriangleIcon, color: "text-red-400" }),
                    _jsx(StatCard, { label: "Dispatched", value: stats.dispatched || 0, icon: TruckIcon, color: "text-yellow-400" }),
                    _jsx(StatCard, { label: "Resolved", value: stats.resolved || 0, icon: CheckCircleIcon, color: "text-green-400" }),
                    _jsx(StatCard, { label: "Critical", value: stats.critical || 0, icon: ExclamationTriangleIcon, color: "text-red-500" }),
                ],
            }),

            // Filters
            _jsxs("div", {
                className: "flex items-center gap-4",
                children: [
                    _jsx("select", {
                        className: "rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none",
                        value: filter.status,
                        onChange: (e) => setFilter((f) => ({ ...f, status: e.target.value })),
                        children: [
                            _jsx("option", { value: "", children: "All Statuses" }),
                            _jsx("option", { value: "detected", children: "Detected" }),
                            _jsx("option", { value: "confirmed", children: "Confirmed" }),
                            _jsx("option", { value: "dispatched", children: "Dispatched" }),
                            _jsx("option", { value: "resolved", children: "Resolved" }),
                            _jsx("option", { value: "false_alarm", children: "False Alarm" }),
                        ],
                    }),
                    _jsx("select", {
                        className: "rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none",
                        value: filter.severity,
                        onChange: (e) => setFilter((f) => ({ ...f, severity: e.target.value })),
                        children: [
                            _jsx("option", { value: "", children: "All Severities" }),
                            _jsx("option", { value: "critical", children: "Critical" }),
                            _jsx("option", { value: "high", children: "High" }),
                            _jsx("option", { value: "medium", children: "Medium" }),
                            _jsx("option", { value: "low", children: "Low" }),
                        ],
                    }),
                ],
            }),

            // Accidents list
            loading
                ? _jsx("div", { className: "text-center py-12 text-dark-400", children: "Loading accidents..." })
                : accidents.length === 0
                    ? _jsxs("div", {
                        className: "text-center py-16",
                        children: [
                            _jsx(CheckCircleIcon, { className: "mx-auto h-16 w-16 text-green-500/50" }),
                            _jsx("p", { className: "mt-4 text-dark-400 text-lg", children: "No accidents detected" }),
                            _jsx("p", { className: "text-dark-500 text-sm", children: "The system is actively monitoring for sudden stops, collisions, and unusual motion." }),
                        ]
                    })
                    : _jsx("div", {
                        className: "space-y-3",
                        children: accidents.map((accident) =>
                            _jsx(AccidentCard, {
                                accident: accident,
                                onStatusUpdate: handleStatusUpdate,
                                updating: updatingId === accident.id,
                            }, accident.id)
                        ),
                    }),
        ],
    });
}

function StatCard({ label, value, icon: Icon, color }) {
    return _jsxs("div", {
        className: "rounded-xl border border-dark-700 bg-dark-800 p-4",
        children: [
            _jsxs("div", {
                className: "flex items-center justify-between",
                children: [
                    _jsx("span", { className: "text-sm text-dark-400", children: label }),
                    _jsx(Icon, { className: clsx("h-5 w-5", color) }),
                ],
            }),
            _jsx("p", { className: "mt-2 text-2xl font-bold text-white", children: value }),
        ],
    });
}

function AccidentCard({ accident, onStatusUpdate, updating }) {
    const [showActions, setShowActions] = useState(false);

    const detectionType = detectionTypeLabels[accident.detection_type] || accident.detection_type;
    const timeStr = accident.created_at ? format(new Date(accident.created_at), 'MMM dd, HH:mm:ss') : '';
    const gpsStr = accident.latitude && accident.longitude
        ? `${parseFloat(accident.latitude).toFixed(5)}, ${parseFloat(accident.longitude).toFixed(5)}`
        : 'Unknown';

    return _jsxs("div", {
        className: "rounded-xl border border-dark-700 bg-dark-800 p-5 transition hover:border-dark-600",
        children: [
            // Top row
            _jsxs("div", {
                className: "flex items-start justify-between",
                children: [
                    _jsxs("div", {
                        className: "flex items-center gap-3",
                        children: [
                            _jsx("span", {
                                className: clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", severityColors[accident.severity] || severityColors.medium),
                                children: (accident.severity || 'medium').toUpperCase(),
                            }),
                            _jsx("span", {
                                className: clsx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", statusColors[accident.status] || statusColors.detected),
                                children: (accident.status || 'detected').replace(/_/g, ' '),
                            }),
                            _jsx("span", {
                                className: "rounded bg-dark-700 px-2 py-0.5 text-xs text-dark-300",
                                children: detectionType,
                            }),
                        ],
                    }),
                    _jsx("span", { className: "text-xs text-dark-500", children: timeStr }),
                ],
            }),

            // Description
            _jsx("p", {
                className: "mt-3 text-sm text-dark-200",
                children: accident.description || `Accident detected via ${detectionType}`,
            }),

            // GPS + vehicle info row
            _jsxs("div", {
                className: "mt-3 flex flex-wrap items-center gap-4 text-xs text-dark-400",
                children: [
                    _jsxs("span", {
                        className: "flex items-center gap-1",
                        children: [
                            _jsx(MapPinIcon, { className: "h-3.5 w-3.5" }),
                            `GPS: ${gpsStr}`,
                        ],
                    }),
                    accident.vehicle_ids && accident.vehicle_ids.length > 0 && _jsxs("span", {
                        className: "flex items-center gap-1",
                        children: [
                            _jsx(TruckIcon, { className: "h-3.5 w-3.5" }),
                            `${accident.vehicle_ids.length} vehicle(s) involved`,
                        ],
                    }),
                    accident.police_notified && _jsx("span", { className: "text-blue-400", children: "Police notified" }),
                    accident.hospital_notified && _jsx("span", { className: "text-green-400", children: "Hospital notified" }),
                ],
            }),

            // Action buttons
            (accident.status === 'detected' || accident.status === 'confirmed' || accident.status === 'dispatched') &&
                _jsxs("div", {
                    className: "mt-4 flex items-center gap-2",
                    children: [
                        accident.status === 'detected' && _jsx("button", {
                            className: "rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500 disabled:opacity-50",
                            disabled: updating,
                            onClick: () => onStatusUpdate(accident.id, 'confirmed'),
                            children: "Confirm",
                        }),
                        (accident.status === 'detected' || accident.status === 'confirmed') && _jsx("button", {
                            className: "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50",
                            disabled: updating,
                            onClick: () => onStatusUpdate(accident.id, 'dispatched'),
                            children: "Dispatch Response",
                        }),
                        (accident.status !== 'resolved') && _jsx("button", {
                            className: "rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-50",
                            disabled: updating,
                            onClick: () => onStatusUpdate(accident.id, 'resolved', 'Resolved by operator'),
                            children: "Resolve",
                        }),
                        _jsx("button", {
                            className: "rounded-lg bg-dark-600 px-3 py-1.5 text-xs font-medium text-dark-300 hover:bg-dark-500 disabled:opacity-50",
                            disabled: updating,
                            onClick: () => onStatusUpdate(accident.id, 'false_alarm', 'Marked as false alarm'),
                            children: "False Alarm",
                        }),
                    ],
                }),
        ],
    });
}
