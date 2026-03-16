import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/store/hooks';
import wsService from '@/services/websocket';
import { updateLivePosition } from '@/store/slices/trackingSlice';
import { updateSignal } from '@/store/slices/signalSlice';
import { addAlert } from '@/store/slices/alertSlice';
import { addViolation } from '@/store/slices/violationSlice';
import { addStolenSighting, setPrediction } from '@/store/slices/vehicleSlice';
import { addAccident, updateAccident } from '@/store/slices/accidentSlice';
import toast from 'react-hot-toast';
/**
 * Connects to the WebSocket on mount, subscribes to all real-time events
 * and dispatches Redux actions.  Disconnects on unmount.
 */
export function useWebSocket(enabled = true) {
    const dispatch = useAppDispatch();
    const mounted = useRef(false);
    useEffect(() => {
        if (!enabled || mounted.current)
            return;
        mounted.current = true;
        const socket = wsService.connect();
        /* ── Vehicle position updates ──────────────────────────────────────── */
        socket.on('vehicle:update', (data) => {
            dispatch(updateLivePosition({
                id: '',
                vehicleId: data.vehicleId,
                location: data.location,
                speed: data.speed,
                heading: data.heading,
                timestamp: data.timestamp,
            }));
        });
        /* ── Signal state changes ──────────────────────────────────────────── */
        socket.on('signal:update', (data) => {
            dispatch(updateSignal({
                id: data.signalId,
                state: data.state,
                remainingSeconds: data.remainingSeconds,
            }));
        });
        /* ── New alert ─────────────────────────────────────────────────────── */
        socket.on('alert:new', (data) => {
            dispatch(addAlert(data.alert));
            // Show toast for critical alerts
            if (data.alert.priority === 'critical') {
                toast.error(data.alert.title, { duration: 6000 });
            }
            else if (data.alert.priority === 'warning') {
                toast(data.alert.title, { icon: '⚠️', duration: 4000 });
            }
        });
        /* ── New violation ─────────────────────────────────────────────────── */
        socket.on('violation:new', (data) => {
            dispatch(addViolation(data.violation));
        });
        /* ── Stolen vehicle spotted ────────────────────────────────────────── */
        socket.on('vehicle:stolen:spotted', (data) => {
            dispatch(addStolenSighting(data));
            toast.error(`🚨 Stolen vehicle spotted: ${data.plateNumber}`, { duration: 8000 });
        });        /* ── Route prediction update ────────────────────────────────────── */
        socket.on('prediction:update', (data) => {
            dispatch(setPrediction(data));
            toast(`📍 Route prediction updated: ${data.plateNumber || 'vehicle'}`, { icon: '🔮', duration: 5000 });
        });
        /* ── Accident detected ─────────────────────────────────────────── */
        socket.on('accident:new', (data) => {
            dispatch(addAccident(data.accident));
            toast.error(`🚨 Accident detected: ${(data.accident.detection_type || 'unknown').replace(/_/g, ' ')}`, { duration: 8000 });
        });
        socket.on('accident:update', (data) => {
            dispatch(updateAccident(data.accident));
        });
        socket.on('accident:critical', (data) => {
            toast.error(`⚠️ CRITICAL ACCIDENT: ${data.accident.description || 'Immediate response required'}`, { duration: 10000 });
        });
        return () => {
            socket.off('vehicle:update');
            socket.off('signal:update');
            socket.off('alert:new');
            socket.off('violation:new');
            socket.off('vehicle:stolen:spotted');
            socket.off('prediction:update');
            socket.off('accident:new');
            socket.off('accident:update');
            socket.off('accident:critical');
            wsService.disconnect();
            mounted.current = false;
        };
    }, [enabled, dispatch]);
}
