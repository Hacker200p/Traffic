import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../common/logger';

class RedisClient {
  private client: Redis;
  private subscriber: Redis;

  constructor() {
    const redisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    this.client = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);

    this.client.on('connect', () => logger.info('Redis client connected'));
    this.client.on('error', (err) => logger.error('Redis client error', { error: err.message }));
    this.subscriber.on('connect', () => logger.info('Redis subscriber connected'));
    this.subscriber.on('error', (err) => logger.error('Redis subscriber error', { error: err.message }));
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.subscriber.connect();
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  // Key-value operations
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // JSON helpers
  async getJSON<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const data = JSON.stringify(value);
    await this.set(key, data, ttlSeconds);
  }

  // Pub/Sub
  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) callback(msg);
    });
  }

  // Token blacklist
  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    await this.set(`bl:${token}`, '1', ttlSeconds);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.exists(`bl:${token}`);
  }

  // Session / refresh token storage
  async storeRefreshToken(userId: string, tokenId: string, ttlSeconds: number): Promise<void> {
    await this.set(`rt:${userId}:${tokenId}`, '1', ttlSeconds);
  }

  async isRefreshTokenValid(userId: string, tokenId: string): Promise<boolean> {
    return this.exists(`rt:${userId}:${tokenId}`);
  }

  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    await this.del(`rt:${userId}:${tokenId}`);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const keys = await this.client.keys(`rt:${userId}:*`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.client.quit();
    await this.subscriber.quit();
    logger.info('Redis connections closed');
  }
}

export const redis = new RedisClient();
