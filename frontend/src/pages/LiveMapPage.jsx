import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLivePositions } from '@/store/slices/trackingSlice';
import { fetchAlerts } from '@/store/slices/alertSlice';
import TrafficMap from '@/components/map/TrafficMap';
import VehicleMarker from '@/components/map/VehicleMarker';
import CongestionHeatmap from '@/components/map/CongestionHeatmap';
import AlertPopup from '@/components/map/AlertPopup';
import { REFRESH_INTERVAL_LIVE } from '@/utils/constants';
export default function LiveMapPage() {
    const dispatch = useAppDispatch();
    const livePositions = useAppSelector((s) => s.tracking.livePositions);
    const alerts = useAppSelector((s) => s.alerts.items.filter((a) => a.location));
    // Layers toggles
    const [showVehicles, setShowVehicles] = useState(true);
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [showAlerts, setShowAlerts] = useState(true);
    // Placeholder density zones (normally fetched from backend)
    const [densityZones] = useState([]);
    useEffect(() => {
        dispatch(fetchLivePositions());
        dispatch(fetchAlerts({ page: 1, limit: 50 }));
        const interval = setInterval(() => {
            dispatch(fetchLivePositions());
        }, REFRESH_INTERVAL_LIVE);
        return () => clearInterval(interval);
    }, [dispatch]);
    return (_jsxs("div", { className: "flex h-[calc(100vh-7rem)] flex-col gap-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: "Live Traffic Map" }), _jsxs("p", { className: "text-sm text-dark-400", children: [livePositions.length, " vehicles tracked in real-time"] })] }), _jsx("div", { className: "flex gap-2", children: [
                            { label: 'Vehicles', active: showVehicles, toggle: () => setShowVehicles((v) => !v) },
                            { label: 'Heatmap', active: showHeatmap, toggle: () => setShowHeatmap((v) => !v) },
                            { label: 'Alerts', active: showAlerts, toggle: () => setShowAlerts((v) => !v) },
                        ].map((layer) => (_jsx("button", { onClick: layer.toggle, className: `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${layer.active
                                ? 'bg-primary-600 text-white'
                                : 'bg-dark-700 text-dark-400 hover:bg-dark-600'}`, children: layer.label }, layer.label))) })] }), _jsx("div", { className: "flex-1 overflow-hidden rounded-xl border border-dark-700", children: _jsxs(TrafficMap, { className: "h-full w-full", children: [showVehicles &&
                            livePositions.map((pos) => (_jsx(VehicleMarker, { record: pos, plateNumber: pos.plateNumber }, pos.vehicleId))), showHeatmap && densityZones.length > 0 && (_jsx(CongestionHeatmap, { zones: densityZones })), showAlerts &&
                            alerts.map((alert) => _jsx(AlertPopup, { alert: alert }, alert.id))] }) })] }));
}
