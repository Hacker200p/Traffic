import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { redis } from '../config/redis';
import { logger } from '../common/logger';
import { JwtPayload } from '../middleware/auth.middleware';

let io: Server;

export const initializeWebSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: config.ws.pingInterval,
    pingTimeout: config.ws.pingTimeout,
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware for Socket.io
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const isBlacklisted = await redis.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return next(new Error('Token has been revoked'));
      }

      const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      (socket as any).user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    logger.info('WebSocket client connected', { userId: user.userId, role: user.role, socketId: socket.id });

    // Join role-based rooms
    socket.join(`role:${user.role}`);
    socket.join(`user:${user.userId}`);

    // Join alert room (all authenticated users)
    socket.join('alerts');

    // Admin and police get tracking updates
    if (user.role === 'admin' || user.role === 'police') {
      socket.join('tracking');
      socket.join('signals');
    }

    // Handle joining specific signal group rooms
    socket.on('join:signal-group', (groupId: string) => {
      socket.join(`signal-group:${groupId}`);
      logger.debug('Client joined signal group', { userId: user.userId, groupId });
    });

    socket.on('leave:signal-group', (groupId: string) => {
      socket.leave(`signal-group:${groupId}`);
    });

    // Handle joining vehicle tracking
    socket.on('track:vehicle', (vehicleId: string) => {
      socket.join(`vehicle:${vehicleId}`);
      logger.debug('Client tracking vehicle', { userId: user.userId, vehicleId });
    });

    socket.on('untrack:vehicle', (vehicleId: string) => {
      socket.leave(`vehicle:${vehicleId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info('WebSocket client disconnected', { userId: user.userId, socketId: socket.id, reason });
    });

    socket.on('error', (error) => {
      logger.error('WebSocket error', { userId: user.userId, socketId: socket.id, error: error.message });
    });
  });

  // Subscribe to Redis pub/sub channels and broadcast to WebSocket rooms
  setupRedisPubSub();

  logger.info('WebSocket server initialized');
  return io;
};

const setupRedisPubSub = () => {
  // New violations → broadcast to alerts room
  // Frontend expects: WsViolationEvent = { violation: Violation }
  redis.subscribe('violations:new', (message) => {
    try {
      const violation = JSON.parse(message);
      io.to('alerts').emit('violation:new', { violation });
      logger.debug('Broadcast new violation via WebSocket', { violationId: violation.id });
    } catch (error) {
      logger.error('Error broadcasting violation', { error });
    }
  });

  // New alerts → broadcast to alerts room
  // Frontend expects: WsAlertEvent = { alert: Alert }
  redis.subscribe('alerts:new', (message) => {
    try {
      const alert = JSON.parse(message);
      io.to('alerts').emit('alert:new', { alert });

      // Critical alerts → also emit to all connected clients
      if (alert.priority === 'critical') {
        io.emit('alert:critical', { alert });
      }

      logger.debug('Broadcast new alert via WebSocket', { alertId: alert.id });
    } catch (error) {
      logger.error('Error broadcasting alert', { error });
    }
  });

  // Alert updates
  redis.subscribe('alerts:update', (message) => {
    try {
      const alert = JSON.parse(message);
      io.to('alerts').emit('alert:update', { alert });
    } catch (error) {
      logger.error('Error broadcasting alert update', { error });
    }
  });

  // Tracking updates → broadcast as vehicle:update to match frontend listener
  // Frontend expects: WsVehicleUpdate = { vehicleId, location, speed, heading, timestamp }
  redis.subscribe('tracking:update', (message) => {
    try {
      const point = JSON.parse(message);
      const vehicleUpdate = {
        vehicleId: point.vehicle_id,
        location: { latitude: point.latitude, longitude: point.longitude },
        speed: point.speed,
        heading: point.heading,
        timestamp: point.recorded_at || new Date().toISOString(),
      };
      io.to('tracking').emit('vehicle:update', vehicleUpdate);
      io.to(`vehicle:${point.vehicle_id}`).emit('vehicle:position', vehicleUpdate);
    } catch (error) {
      logger.error('Error broadcasting tracking update', { error });
    }
  });

  // Signal state changes → broadcast as signal:update to match frontend listener
  // Frontend expects: WsSignalUpdate = { signalId, state, remainingSeconds }
  redis.subscribe('signals:state-change', (message) => {
    try {
      const change = JSON.parse(message);
      const signalUpdate = {
        signalId: change.signalId,
        state: change.newState,
        remainingSeconds: change.duration ?? 0,
        previousState: change.previousState,
        reason: change.reason,
        timestamp: change.timestamp,
      };
      io.to('signals').emit('signal:update', signalUpdate);

      // If signal belongs to a group, notify group room
      if (change.groupId) {
        io.to(`signal-group:${change.groupId}`).emit('signal:update', signalUpdate);
      }

      logger.debug('Broadcast signal state change via WebSocket', { signalId: change.signalId });
    } catch (error) {
      logger.error('Error broadcasting signal state change', { error });
    }
  });
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
};

export const emitToUser = (userId: string, event: string, data: any): void => {
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToRole = (role: string, event: string, data: any): void => {
  io.to(`role:${role}`).emit(event, data);
};

export const broadcastAlert = (alert: any): void => {
  io.to('alerts').emit('alert:new', alert);
};
