import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLostVehicles, clearPrediction } from '@/store/slices/vehicleSlice';
import TrafficMap from '@/components/map/TrafficMap';
import { Marker, Source, Layer } from 'react-map-gl';
import { trackingApi } from '@/api/tracking.api';
import { formatDateTime, timeAgo } from '@/utils/formatters';
import { VEHICLE_ICONS, DEFAULT_PAGE_SIZE } from '@/utils/constants';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const HEADING_LABELS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function headingToLabel(deg) {
    if (deg == null) return '—';
    return HEADING_LABELS[Math.round(deg / 45) % 8];
}

export default function PredictiveRoutePage() {
    const dispatch = useAppDispatch();
    const [searchParams] = useSearchParams();
    const { lostVehicles, loading: vehiclesLoading, latestPrediction } = useAppSelector((s) => s.vehicles);

    const [selectedVehicleId, setSelectedVehicleId] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [predictionLoading, setPredictionLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [mapKey, setMapKey] = useState(0);
    const [mapCenter, setMapCenter] = useState(null);
    const initialLoadDone = useRef(false);

    useEffect(() => {
        dispatch(fetchLostVehicles({ page: 1, limit: 100, search }));
    }, [dispatch, search]);

    // Auto-select vehicle from URL param
    useEffect(() => {
        if (initialLoadDone.current) return;
        const vehicleIdParam = searchParams.get('vehicleId');
        if (vehicleIdParam && lostVehicles.length > 0) {
            initialLoadDone.current = true;
            handlePredict(vehicleIdParam);
        }
    }, [searchParams, lostVehicles]);

    // Listen for real-time WebSocket prediction updates
    useEffect(() => {
        if (!latestPrediction) return;
        if (latestPrediction.vehicleId === selectedVehicleId && latestPrediction.prediction) {
            setPrediction({ vehicle: latestPrediction.vehicle, prediction: latestPrediction.prediction });
            toast.success('Real-time prediction update received', { duration: 3000 });
        }
        return () => { dispatch(clearPrediction()); };
    }, [latestPrediction]);

    const handlePredict = useCallback(async (vehicleId) => {
        setSelectedVehicleId(vehicleId);
        setPrediction(null);
        setPredictionLoading(true);
        try {
            const { data } = await trackingApi.predictRoute(vehicleId);
            setPrediction(data.data);
            if (!data.data.prediction) {
                toast.error(data.data.message || 'Insufficient sighting data for prediction');
            } else {
                toast.success(`Prediction generated — ${data.data.prediction.interceptionPoints.length} interception points`);
                // Auto-center map on the vehicle's last known position
                const mv = data.data.prediction.movementVector;
                if (mv?.lastPosition) {
                    setMapCenter([mv.lastPosition.longitude, mv.lastPosition.latitude]);
                    setMapKey(k => k + 1);
                }
            }
        } catch {
            toast.error('Failed to generate route prediction');
        } finally {
            setPredictionLoading(false);
        }
    }, []);

    const selectedVehicle = useMemo(() =>
        lostVehicles.find(v => v.id === selectedVehicleId),
        [lostVehicles, selectedVehicleId]
    );

    const pred = prediction?.prediction;

    // GeoJSON for history trail (blue line)
    const historyLine = useMemo(() => {
        if (!pred?.historyTrail?.length) return null;
        return {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: pred.historyTrail.map(p => [p.longitude, p.latitude]),
            },
        };
    }, [pred]);

    // GeoJSON for projected path (dashed yellow line)
    const projectedLine = useMemo(() => {
        if (!pred?.projectedPath?.length || !pred?.movementVector) return null;
        const coords = [
            [pred.movementVector.lastPosition.longitude, pred.movementVector.lastPosition.latitude],
            ...pred.projectedPath.map(p => [p.longitude, p.latitude]),
        ];
        return {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
        };
    }, [pred]);

    return (_jsxs("div", { className: "space-y-6", children: [
        _jsxs("div", { children: [
            _jsx("h1", { className: "text-2xl font-bold text-white", children: "Predictive Route Analysis" }),
            _jsx("p", { className: "mt-1 text-sm text-dark-400", children: "Analyse stolen vehicle trajectories and predict interception points" }),
        ] }),

        _jsxs("div", { className: "grid gap-6 lg:grid-cols-3", children: [
            // ── Left panel: vehicle list ─────────────────────────────
            _jsxs("div", { className: "space-y-3 lg:col-span-1", children: [
                _jsx("input", {
                    type: "text",
                    placeholder: "Search by plate number...",
                    value: search,
                    onChange: (e) => setSearch(e.target.value),
                    className: "w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-2 text-sm text-white placeholder-dark-500 outline-none focus:border-primary-500",
                }),

                _jsx("div", { className: "max-h-[600px] space-y-2 overflow-y-auto pr-1", children:
                    vehiclesLoading
                        ? _jsx("p", { className: "text-sm text-dark-400 py-4 text-center", children: "Loading vehicles..." })
                        : lostVehicles.length === 0
                            ? _jsx("p", { className: "text-sm text-dark-500 py-4 text-center", children: "No lost vehicles" })
                            : lostVehicles.map(v => (
                                _jsxs("div", {
                                    className: clsx(
                                        "rounded-lg border p-3 cursor-pointer transition-colors",
                                        v.id === selectedVehicleId
                                            ? "border-primary-500 bg-primary-600/10"
                                            : "border-dark-700 bg-dark-800 hover:border-dark-600"
                                    ),
                                    onClick: () => handlePredict(v.id),
                                    children: [
                                        _jsxs("div", { className: "flex items-center justify-between", children: [
                                            _jsxs("span", { className: "font-mono text-sm font-semibold text-red-400", children: [
                                                VEHICLE_ICONS[v.type] || '🚗', " ", v.plateNumber,
                                            ] }),
                                            _jsx("span", { className: "text-xs text-dark-500", children: v.type }),
                                        ] }),
                                        v.make && _jsxs("p", { className: "text-xs text-dark-400 mt-1", children: [
                                            v.make, " ", v.model, v.color ? ` · ${v.color}` : '',
                                        ] }),
                                    ],
                                }, v.id)
                            )),
                }),
            ] }),

            // ── Right panel: map + prediction details ───────────────
            _jsxs("div", { className: "space-y-4 lg:col-span-2", children: [
                // Map
                _jsx("div", { className: "h-[450px] overflow-hidden rounded-xl border border-dark-700", children:
                    _jsxs(TrafficMap, { key: mapKey, initialCenter: mapCenter, initialZoom: mapCenter ? 14 : undefined, children: [
                        // History trail (blue line)
                        historyLine && (_jsx(Source, { id: "history-line", type: "geojson", data: historyLine, children:
                            _jsx(Layer, { id: "history-line-layer", type: "line", paint: {
                                'line-color': '#3b82f6',
                                'line-width': 3,
                                'line-opacity': 0.8,
                            } }),
                        })),

                        // Projected path (dashed yellow)
                        projectedLine && (_jsx(Source, { id: "projected-line", type: "geojson", data: projectedLine, children:
                            _jsx(Layer, { id: "projected-line-layer", type: "line", paint: {
                                'line-color': '#eab308',
                                'line-width': 3,
                                'line-dasharray': [4, 3],
                                'line-opacity': 0.9,
                            } }),
                        })),

                        // History sighting markers (blue dots)
                        pred?.historyTrail?.map((p, i) => (
                            _jsx(Marker, {
                                longitude: p.longitude,
                                latitude: p.latitude,
                                anchor: "center",
                                children: _jsx("div", {
                                    className: "h-3 w-3 rounded-full bg-blue-500 ring-1 ring-blue-300/40",
                                    title: `${p.cameraName || p.source} · ${formatDateTime(p.timestamp)}`,
                                }),
                            }, `hist-${i}`)
                        )),

                        // Last known position (orange pulsing)
                        pred?.movementVector && (_jsx(Marker, {
                            longitude: pred.movementVector.lastPosition.longitude,
                            latitude: pred.movementVector.lastPosition.latitude,
                            anchor: "center",
                            children: _jsx("div", {
                                className: "flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow-lg ring-2 ring-orange-300/50 animate-pulse",
                                title: "Last known position",
                                children: "📍",
                            }),
                        })),

                        // Interception points (red markers)
                        pred?.interceptionPoints?.map((pt, i) => (
                            _jsx(Marker, {
                                longitude: pt.longitude,
                                latitude: pt.latitude,
                                anchor: "center",
                                children: _jsx("div", {
                                    className: clsx(
                                        "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shadow-lg ring-2",
                                        pt.confidence >= 70
                                            ? "bg-red-600 ring-red-400/50 text-white"
                                            : pt.confidence >= 40
                                                ? "bg-yellow-600 ring-yellow-400/50 text-white"
                                                : "bg-dark-600 ring-dark-400/50 text-dark-200"
                                    ),
                                    title: `${pt.name || pt.intersection || 'Point'} — ${pt.confidence}% · ETA ${pt.etaMinutes?.toFixed(1) ?? '?'} min`,
                                    children: pt.type === 'camera' ? '📷' : '🚦',
                                }),
                            }, `ip-${i}`)
                        )),
                    ] }),
                }),

                // Legend
                pred && (_jsxs("div", { className: "flex flex-wrap items-center gap-4 text-xs text-dark-400", children: [
                    _jsxs("span", { className: "flex items-center gap-1.5", children: [
                        _jsx("span", { className: "inline-block h-2 w-6 rounded bg-blue-500" }),
                        "History trail",
                    ] }),
                    _jsxs("span", { className: "flex items-center gap-1.5", children: [
                        _jsx("span", { className: "inline-block h-2 w-6 rounded bg-yellow-500 opacity-80", style: { backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, #1a1a2e 4px, #1a1a2e 7px)' } }),
                        "Projected path",
                    ] }),
                    _jsxs("span", { className: "flex items-center gap-1.5", children: [
                        _jsx("span", { className: "inline-block h-3 w-3 rounded-full bg-orange-500 animate-pulse" }),
                        "Last position",
                    ] }),
                    _jsxs("span", { className: "flex items-center gap-1.5", children: [
                        _jsx("span", { className: "inline-block h-3 w-3 rounded-full bg-red-600" }),
                        "📷/🚦 Interception point",
                    ] }),
                ] })),

                // Loading state
                predictionLoading && (_jsx("div", { className: "flex items-center justify-center py-8", children:
                    _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" }),
                })),

                // Movement vector summary
                pred?.movementVector && (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800 p-4", children: [
                    _jsx("h3", { className: "text-sm font-semibold text-white mb-3", children: "Movement Analysis" }),
                    _jsxs("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-4", children: [
                        _jsxs("div", { children: [
                            _jsx("p", { className: "text-xs text-dark-400", children: "Heading" }),
                            _jsxs("p", { className: "text-lg font-bold text-white", children: [
                                headingToLabel(pred.movementVector.heading), " ",
                                _jsxs("span", { className: "text-sm text-dark-400", children: ["(", pred.movementVector.heading, "°)"] }),
                            ] }),
                        ] }),
                        _jsxs("div", { children: [
                            _jsx("p", { className: "text-xs text-dark-400", children: "Avg Speed" }),
                            _jsxs("p", { className: "text-lg font-bold text-white", children: [pred.movementVector.avgSpeedKmh, " km/h"] }),
                        ] }),
                        _jsxs("div", { children: [
                            _jsx("p", { className: "text-xs text-dark-400", children: "Points Analysed" }),
                            _jsx("p", { className: "text-lg font-bold text-white", children: pred.movementVector.pointsAnalysed }),
                        ] }),
                        _jsxs("div", { children: [
                            _jsx("p", { className: "text-xs text-dark-400", children: "Last Seen" }),
                            _jsx("p", { className: "text-sm font-medium text-yellow-400", children: timeAgo(pred.movementVector.lastSeen) }),
                        ] }),
                    ] }),
                ] })),

                // Interception points table
                pred?.interceptionPoints?.length > 0 && (_jsxs("div", { className: "rounded-xl border border-dark-700 bg-dark-800 p-4", children: [
                    _jsxs("h3", { className: "text-sm font-semibold text-white mb-3", children: [
                        "Interception Points ",
                        _jsxs("span", { className: "text-dark-400 font-normal", children: ["(", pred.interceptionPoints.length, ")"] }),
                    ] }),
                    _jsx("div", { className: "overflow-x-auto", children:
                        _jsxs("table", { className: "w-full text-sm", children: [
                            _jsx("thead", { children:
                                _jsxs("tr", { className: "border-b border-dark-700 text-left text-xs text-dark-400", children: [
                                    _jsx("th", { className: "pb-2 pr-3", children: "Type" }),
                                    _jsx("th", { className: "pb-2 pr-3", children: "Name / Intersection" }),
                                    _jsx("th", { className: "pb-2 pr-3 text-right", children: "Distance" }),
                                    _jsx("th", { className: "pb-2 pr-3 text-right", children: "ETA" }),
                                    _jsx("th", { className: "pb-2 text-right", children: "Confidence" }),
                                ] }),
                            }),
                            _jsx("tbody", { children:
                                pred.interceptionPoints.map((pt, i) => (
                                    _jsxs("tr", { className: "border-b border-dark-700/50", children: [
                                        _jsx("td", { className: "py-2 pr-3", children:
                                            _jsx("span", { className: clsx(
                                                "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
                                                pt.type === 'camera' ? "bg-blue-600/20 text-blue-400" : "bg-emerald-600/20 text-emerald-400"
                                            ), children: pt.type === 'camera' ? '📷 Camera' : '🚦 Signal' }),
                                        }),
                                        _jsxs("td", { className: "py-2 pr-3 text-white", children: [
                                            pt.name || pt.intersection || '—',
                                            pt.intersection && pt.name !== pt.intersection && (
                                                _jsxs("span", { className: "text-xs text-dark-400 ml-1", children: ["(", pt.intersection, ")"] })
                                            ),
                                        ] }),
                                        _jsxs("td", { className: "py-2 pr-3 text-right text-dark-300", children: [pt.distanceKm, " km"] }),
                                        _jsxs("td", { className: "py-2 pr-3 text-right text-dark-300", children: [
                                            pt.etaMinutes != null ? `${pt.etaMinutes} min` : '—',
                                        ] }),
                                        _jsx("td", { className: "py-2 text-right", children:
                                            _jsxs("span", { className: clsx(
                                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                                pt.confidence >= 70 ? "bg-red-600/20 text-red-400"
                                                    : pt.confidence >= 40 ? "bg-yellow-600/20 text-yellow-400"
                                                    : "bg-dark-600/20 text-dark-300"
                                            ), children: [pt.confidence, "%"] }),
                                        }),
                                    ] }, i)
                                )),
                            }),
                        ] }),
                    }),
                ] })),

                // No prediction selected state
                !pred && !predictionLoading && (_jsx("div", { className: "flex flex-col items-center justify-center rounded-xl border border-dark-700 bg-dark-800 py-16 text-center", children: [
                    _jsx("p", { className: "text-lg text-dark-400", children: "Select a stolen vehicle to predict its route" }),
                    _jsx("p", { className: "mt-1 text-sm text-dark-500", children: "Click on any vehicle in the list to generate trajectory analysis" }),
                ] })),
            ] }),
        ] }),
    ] }));
}
