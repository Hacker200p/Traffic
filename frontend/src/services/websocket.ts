import { io, Socket } from 'socket.io-client';
import { WS_URL, LS_ACCESS_TOKEN } from '@/utils/constants';

class WebSocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    const token = localStorage.getItem(LS_ACCESS_TOKEN);

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
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

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  on<T>(event: string, handler: (data: T) => void): void {
    this.socket?.on(event, handler);
  }

  off(event: string): void {
    this.socket?.off(event);
  }

  emit<T>(event: string, data?: T): void {
    this.socket?.emit(event, data);
  }
}

export const wsService = new WebSocketService();
export default wsService;
