import { io } from 'socket.io-client';
import { WS_URL, LS_ACCESS_TOKEN } from '@/utils/constants';
class WebSocketService {
    constructor() {
        this.socket = null;
        this.subscribers = 0;
        this.disconnectTimer = null;
    }
    connect() {
        this.subscribers += 1;
        if (this.disconnectTimer) {
            clearTimeout(this.disconnectTimer);
            this.disconnectTimer = null;
        }
        if (this.socket)
            return this.socket;
        const token = localStorage.getItem(LS_ACCESS_TOKEN);
        this.socket = io(WS_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
        });
        this.socket.on('connect', () => {
            console.info('[WS] Connected:', this.socket?.id);
        });
        this.socket.on('disconnect', (reason) => {
            console.warn('[WS] Disconnected:', reason);
        });
        this.socket.on('connect_error', (err) => {
            console.error('[WS] Connection error:', err.message);
        });
        return this.socket;
    }
    disconnect() {
        this.subscribers = Math.max(0, this.subscribers - 1);
        if (this.subscribers > 0)
            return;
        if (this.disconnectTimer) {
            clearTimeout(this.disconnectTimer);
        }
        this.disconnectTimer = setTimeout(() => {
            if (this.subscribers > 0)
                return;
            if (!this.socket)
                return;
            this.socket.off();
            this.socket.disconnect();
            this.socket = null;
            this.disconnectTimer = null;
        }, 300);
    }
    getSocket() {
        return this.socket;
    }
    on(event, handler) {
        this.socket?.on(event, handler);
    }
    off(event) {
        this.socket?.off(event);
    }
    emit(event, data) {
        this.socket?.emit(event, data);
    }
}
export const wsService = new WebSocketService();
export default wsService;
