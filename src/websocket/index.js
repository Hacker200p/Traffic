"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastAlert = exports.emitToRole = exports.emitToUser = exports.getIO = exports.initializeWebSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const redis_1 = require("../config/redis");
const logger_1 = require("../common/logger");
let io;
const initializeWebSocket = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: config_1.config.cors.origins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingInterval: config_1.config.ws.pingInterval,
        pingTimeout: config_1.config.ws.pingTimeout,
        transports: ['websocket', 'polling'],
    });
    // Authentication middleware for Socket.io
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            const isBlacklisted = await redis_1.redis.isTokenBlacklisted(token);
            if (isBlacklisted) {
                return next(new Error('Token has been revoked'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.accessSecret);
            socket.user = decoded;
            next();
        }
        catch (error) {
            next(new Error('Invalid authentication token'));
        }
    });
    io.on('connection', (socket) => {
        const user = socket.user;
        logger_1.logger.info('WebSocket client connected', { userId: user.userId, role: user.role, socketId: socket.id });
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
        socket.on('join:signal-group', (groupId) => {
            socket.join(`signal-group:${groupId}`);
            logger_1.logger.debug('Client joined signal group', { userId: user.userId, groupId });
        });
        socket.on('leave:signal-group', (groupId) => {
            socket.leave(`signal-group:${groupId}`);
        });
        // Handle joining vehicle tracking
        socket.on('track:vehicle', (vehicleId) => {
            socket.join(`vehicle:${vehicleId}`);
            logger_1.logger.debug('Client tracking vehicle', { userId: user.userId, vehicleId });
        });
        socket.on('untrack:vehicle', (vehicleId) => {
            socket.leave(`vehicle:${vehicleId}`);
        });
        socket.on('disconnect', (reason) => {
            logger_1.logger.info('WebSocket client disconnected', { userId: user.userId, socketId: socket.id, reason });
        });
        socket.on('error', (error) => {
            logger_1.logger.error('WebSocket error', { userId: user.userId, socketId: socket.id, error: error.message });
        });
    });
    // Subscribe to Redis pub/sub channels and broadcast to WebSocket rooms
    setupRedisPubSub();
    logger_1.logger.info('WebSocket server initialized');
    return io;
};
exports.initializeWebSocket = initializeWebSocket;
const setupRedisPubSub = () => {
    // New violations → broadcast to alerts room
    // Frontend expects: WsViolationEvent = { violation: Violation }
    redis_1.redis.subscribe('violations:new', (message) => {
        try {
            const violation = JSON.parse(message);
            io.to('alerts').emit('violation:new', { violation });
            logger_1.logger.debug('Broadcast new violation via WebSocket', { violationId: violation.id });
        }
        catch (error) {
            logger_1.logger.error('Error broadcasting violation', { error });
        }
    });
    // New alerts → broadcast to alerts room
    // Frontend expects: WsAlertEvent = { alert: Alert }
    redis_1.redis.subscribe('alerts:new', (message) => {
        try {
            const alert = JSON.parse(message);
            io.to('alerts').emit('alert:new', { alert });
            // Critical alerts → also emit to all connected clients
            if (alert.priority === 'critical') {
                io.emit('alert:critical', { alert });
            }
            logger_1.logger.debug('Broadcast new alert via WebSocket', { alertId: alert.id });
        }
        catch (error) {
            logger_1.logger.error('Error broadcasting alert', { error });
        }
    });
    // Alert updates
    redis_1.redis.subscribe('alerts:update', (message) => {
        try {
            const alert = JSON.parse(message);
            io.to('alerts').emit('alert:update', { alert });
        }
        catch (error) {
            logger_1.logger.error('Error broadcasting alert update', { error });
        }
    });
    // Tracking updates → broadcast as vehicle:update to match frontend listener
    // Frontend expects: WsVehicleUpdate = { vehicleId, location, speed, heading, timestamp }
    redis_1.redis.subscribe('tracking:update', (message) => {
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
        }
        catch (error) {
            logger_1.logger.error('Error broadcasting tracking update', { error });
        }
    });
    // Signal state changes → broadcast as signal:update to match frontend listener
    // Frontend expects: WsSignalUpdate = { signalId, state, remainingSeconds }
    redis_1.redis.subscribe('signals:state-change', (message) => {
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
            logger_1.logger.debug('Broadcast signal state change via WebSocket', { signalId: change.signalId });
        }
        catch (error) {
            logger_1.logger.error('Error broadcasting signal state change', { error });
        }
    });
};
const getIO = () => {
    if (!io) {
        throw new Error('WebSocket server not initialized');
    }
    return io;
};
exports.getIO = getIO;
const emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
};
exports.emitToUser = emitToUser;
const emitToRole = (role, event, data) => {
    io.to(`role:${role}`).emit(event, data);
};
exports.emitToRole = emitToRole;
const broadcastAlert = (alert) => {
    io.to('alerts').emit('alert:new', alert);
};
exports.broadcastAlert = broadcastAlert;
