import { io } from 'socket.io-client';
import { WS_URL, LS_ACCESS_TOKEN } from '@/utils/constants';
class WebSocketService {
    constructor() {
        this.socket = null;
    }
    connect() {
        if (this.socket?.connected)
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
        this.socket?.disconnect();
        this.socket = null;
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
