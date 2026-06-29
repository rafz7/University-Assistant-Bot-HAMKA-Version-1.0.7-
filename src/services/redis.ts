import Redis from 'ioredis';
import { config } from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('redis');
let redisClient: Redis | null = null;
let redisAvailable = false;

const memCache = new Map<string, { value: string; expires: number }>();

export const connectRedis = async (): Promise<void> => {
  return new Promise<void>((resolve) => {
    let settled = false;

    const client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      connectTimeout: 3000,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      reconnectOnError: () => false,
    });

    client.on('error', (err) => {
      if (!settled) {
        settled = true;
        redisAvailable = false;
        redisClient = null;
        logger.warn('Redis unavailable — using in-memory cache', { message: err.message });
        client.disconnect();
        resolve();
      }
    });

    client.connect()
      .then(() => {
        if (!settled) {
          settled = true;
          redisAvailable = true;
          redisClient = client;
          logger.info('Redis connected');
          resolve();
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          redisAvailable = false;
          redisClient = null;
          client.disconnect();
          resolve();
        }
      });
  });
};

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      if (redisAvailable && redisClient) {
        const val = await redisClient.get(key);
        if (!val) return null;
        return JSON.parse(val) as T;
      }
      const item = memCache.get(key);
      if (!item) return null;
      if (Date.now() > item.expires) { memCache.delete(key); return null; }
      return JSON.parse(item.value) as T;
    } catch { return null; }
  },

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    try {
      const str = JSON.stringify(value);
      if (redisAvailable && redisClient) {
        await redisClient.setex(key, ttlSeconds, str);
      } else {
        memCache.set(key, { value: str, expires: Date.now() + ttlSeconds * 1000 });
        if (memCache.size > 500) {
          const now = Date.now();
          memCache.forEach((v, k) => { if (now > v.expires) memCache.delete(k); });
        }
      }
    } catch {}
  },

  async del(key: string): Promise<void> {
    try {
      if (redisAvailable && redisClient) await redisClient.del(key);
      else memCache.delete(key);
    } catch {}
  },

  async exists(key: string): Promise<boolean> {
    try {
      if (redisAvailable && redisClient) return (await redisClient.exists(key)) === 1;
      return memCache.has(key);
    } catch { return false; }
  },

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      if (redisAvailable && redisClient) {
        const val = await redisClient.incr(key);
        if (ttlSeconds && val === 1) await redisClient.expire(key, ttlSeconds);
        return val;
      }
      const item = memCache.get(key);
      const current = item ? parseInt(JSON.parse(item.value)) : 0;
      const next = current + 1;
      memCache.set(key, { value: JSON.stringify(next), expires: Date.now() + (ttlSeconds || 60) * 1000 });
      return next;
    } catch { return 1; }
  },
};
