import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLivePositions, fetchCameras } from '@/store/slices/trackingSlice';
import { fetchAlerts } from '@/store/slices/alertSlice';
import { fetchSignals } from '@/store/slices/signalSlice';
import { fetchDensityZones } from '@/store/slices/analyticsSlice';
import TrafficMap from '@/components/map/TrafficMap';
import VehicleMarker from '@/components/map/VehicleMarker';
import CameraMarker from '@/components/map/CameraMarker';
import SignalMarker from '@/components/map/SignalMarker';
import CongestionHeatmap from '@/components/map/CongestionHeatmap';
import AlertPopup from '@/components/map/AlertPopup';
import { REFRESH_INTERVAL_LIVE } from '@/utils/constants';
export default function LiveMapPage() {
    const dispatch = useAppDispatch();
    const livePositions = useAppSelector((s) => s.tracking.livePositions);
    const cameras = useAppSelector((s) => s.tracking.cameras);
    const signals = useAppSelector((s) => s.signals.items);
    const densityZones = useAppSelector((s) => s.analytics.densityZones);
    const alertItems = useAppSelector((s) => s.alerts.items);
    const alerts = useMemo(() => alertItems.filter((a) => a.location), [alertItems]);
    const normalizedCameras = useMemo(() => cameras
        .map((camera) => {
        if (!camera)
            return null;
        const latitude = camera.location?.latitude ?? camera.latitude;
        const longitude = camera.location?.longitude ?? camera.longitude;
        if (latitude == null || longitude == null)
            return null;
        return {
            ...camera,
            type: camera.type ?? camera.cameraType ?? camera.camera_type ?? 'fixed',
            isOnline: camera.isOnline ?? camera.is_online ?? false,
            location: {
                latitude: Number(latitude),
                longitude: Number(longitude),
            },
        };
    })
        .filter(Boolean), [cameras]);
    // Layers toggles
    const [showVehicles, setShowVehicles] = useState(true);
    const [showCameras, setShowCameras] = useState(true);
    const [showSignals, setShowSignals] = useState(true);
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [showAlerts, setShowAlerts] = useState(true);
    useEffect(() => {
        dispatch(fetchLivePositions());
        dispatch(fetchCameras());
        dispatch(fetchSignals());
        dispatch(fetchDensityZones());
        dispatch(fetchAlerts({ page: 1, limit: 50 }));
        const interval = setInterval(() => {
            dispatch(fetchLivePositions());
            dispatch(fetchDensityZones());
        }, REFRESH_INTERVAL_LIVE);
        return () => clearInterval(interval);
    }, [dispatch]);
    return (_jsxs("div", { className: "flex h-[calc(100vh-7rem)] flex-col gap-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: "Live Traffic Map" }), _jsxs("p", { className: "text-sm text-dark-400", children: [livePositions.length, " vehicles tracked in real-time"] })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: [
                            { label: 'Vehicles', active: showVehicles, toggle: () => setShowVehicles((v) => !v) },
                            { label: 'Cameras', active: showCameras, toggle: () => setShowCameras((v) => !v) },
                            { label: 'Signals', active: showSignals, toggle: () => setShowSignals((v) => !v) },
                            { label: 'Density', active: showHeatmap, toggle: () => setShowHeatmap((v) => !v) },
                            { label: 'Alerts', active: showAlerts, toggle: () => setShowAlerts((v) => !v) },
                        ].map((layer) => (_jsx("button", { onClick: layer.toggle, className: `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${layer.active
                                ? 'bg-primary-600 text-white'
                                : 'bg-dark-700 text-dark-400 hover:bg-dark-600'}`, children: layer.label }, layer.label))) })] }), _jsx("div", { className: "flex-1 overflow-hidden rounded-xl border border-dark-700", children: _jsxs(TrafficMap, { className: "h-full w-full", children: [showHeatmap && densityZones.length > 0 && (_jsx(CongestionHeatmap, { zones: densityZones })), showVehicles &&
                            livePositions.map((pos) => (_jsx(VehicleMarker, { record: pos, plateNumber: pos.plateNumber }, pos.vehicleId))), showCameras &&
                            normalizedCameras.map((cam) => (_jsx(CameraMarker, { camera: cam }, cam.id ?? `${cam.name}-${cam.location.latitude}-${cam.location.longitude}`))), showSignals &&
                            signals.filter((s) => s.location).map((sig) => (_jsx(SignalMarker, { signal: sig }, sig.id))), showAlerts &&
                            alerts.map((alert) => _jsx(AlertPopup, { alert: alert }, alert.id))] }) })] }));
}
