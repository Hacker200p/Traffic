"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
const logger_1 = require("../common/logger");
class RedisClient {
    client;
    subscriber;
    constructor() {
        const redisConfig = {
            host: config_1.config.redis.host,
            port: config_1.config.redis.port,
            password: config_1.config.redis.password || undefined,
            db: config_1.config.redis.db,
            retryStrategy: (times) => {
                const delay = Math.min(times * 200, 5000);
                return delay;
            },
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        };
        this.client = new ioredis_1.default(redisConfig);
        this.subscriber = new ioredis_1.default(redisConfig);
        this.client.on('connect', () => logger_1.logger.info('Redis client connected'));
        this.client.on('error', (err) => logger_1.logger.error('Redis client error', { error: err.message }));
        this.subscriber.on('connect', () => logger_1.logger.info('Redis subscriber connected'));
        this.subscriber.on('error', (err) => logger_1.logger.error('Redis subscriber error', { error: err.message }));
    }
    async connect() {
        await this.client.connect();
        await this.subscriber.connect();
    }
    getClient() {
        return this.client;
    }
    getSubscriber() {
        return this.subscriber;
    }
    // Key-value operations
    async get(key) {
        return this.client.get(key);
    }
    async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
            await this.client.setex(key, ttlSeconds, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async del(key) {
        await this.client.del(key);
    }
    async exists(key) {
        const result = await this.client.exists(key);
        return result === 1;
    }
    // JSON helpers
    async getJSON(key) {
        const data = await this.client.get(key);
        if (!data)
            return null;
        return JSON.parse(data);
    }
    async setJSON(key, value, ttlSeconds) {
        const data = JSON.stringify(value);
        await this.set(key, data, ttlSeconds);
    }
    // Pub/Sub
    async publish(channel, message) {
        await this.client.publish(channel, message);
    }
    async subscribe(channel, callback) {
        await this.subscriber.subscribe(channel);
        this.subscriber.on('message', (ch, msg) => {
            if (ch === channel)
                callback(msg);
        });
    }
    // Token blacklist
    async blacklistToken(token, ttlSeconds) {
        await this.set(`bl:${token}`, '1', ttlSeconds);
    }
    async isTokenBlacklisted(token) {
        return this.exists(`bl:${token}`);
    }
    // Session / refresh token storage
    async storeRefreshToken(userId, tokenId, ttlSeconds) {
        await this.set(`rt:${userId}:${tokenId}`, '1', ttlSeconds);
    }
    async isRefreshTokenValid(userId, tokenId) {
        return this.exists(`rt:${userId}:${tokenId}`);
    }
    async revokeRefreshToken(userId, tokenId) {
        await this.del(`rt:${userId}:${tokenId}`);
    }
    async revokeAllUserTokens(userId) {
        const keys = await this.client.keys(`rt:${userId}:*`);
        if (keys.length > 0) {
            await this.client.del(...keys);
        }
    }
    // Health check
    async healthCheck() {
        try {
            const pong = await this.client.ping();
            return pong === 'PONG';
        }
        catch {
            return false;
        }
    }
    async close() {
        await this.client.quit();
        await this.subscriber.quit();
        logger_1.logger.info('Redis connections closed');
    }
}
exports.redis = new RedisClient();
