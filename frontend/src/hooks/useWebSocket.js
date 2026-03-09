import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/store/hooks';
import wsService from '@/services/websocket';
import { updateLivePosition } from '@/store/slices/trackingSlice';
import { updateSignal } from '@/store/slices/signalSlice';
import { addAlert } from '@/store/slices/alertSlice';
import { addViolation } from '@/store/slices/violationSlice';
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
        return () => {
            wsService.disconnect();
            mounted.current = false;
        };
    }, [enabled, dispatch]);
}
