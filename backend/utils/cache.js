/**
 * Cache utility with Redis support and in-memory fallback.
 * Uses Redis if REDIS_URL is configured, otherwise falls back to an LRU in-memory cache.
 */

const MAX_MEMORY_ITEMS = 500;
const DEFAULT_TTL_SECONDS = 300; // 5 minutes

let redisClient = null;
let redisAvailable = false;

// In-memory fallback cache
class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  _key(key) {
    return `ojawa:${key}`;
  }

  async get(key) {
    const entry = this.store.get(this._key(key));
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(this._key(key));
      return null;
    }
    return entry.value;
  }

  async set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    // Simple LRU eviction when over capacity
    if (this.store.size >= MAX_MEMORY_ITEMS) {
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
    }

    this.store.set(this._key(key), {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
    });
    return true;
  }

  async del(key) {
    this.store.delete(this._key(key));
    return true;
  }

  async delPattern(pattern) {
    const prefix = this._key(pattern.replace('*', ''));
    for (const [k] of this.store) {
      if (k.startsWith(prefix)) {
        this.store.delete(k);
      }
    }
    return true;
  }
}

const memoryCache = new MemoryCache();

async function initRedis() {
  if (redisAvailable || redisClient) return redisAvailable;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log('ℹ️  REDIS_URL not set, using in-memory cache fallback');
    return false;
  }

  try {
    const { createClient } = require('redis');
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err) => {
      console.error('Redis error:', err.message);
      redisAvailable = false;
    });
    await redisClient.connect();
    redisAvailable = true;
    console.log('✅ Redis cache connected');
    return true;
  } catch (error) {
    console.warn('⚠️  Redis connection failed, using in-memory cache:', error.message);
    redisAvailable = false;
    return false;
  }
}

const cache = {
  /**
   * Get value from cache
   */
  async get(key) {
    await initRedis();
    if (redisAvailable && redisClient) {
      const val = await redisClient.get(`ojawa:${key}`);
      return val ? JSON.parse(val) : null;
    }
    return memoryCache.get(key);
  },

  /**
   * Set value in cache
   */
  async set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    await initRedis();
    const serialized = JSON.stringify(value);
    if (redisAvailable && redisClient) {
      await redisClient.set(`ojawa:${key}`, serialized, { EX: ttlSeconds });
      return true;
    }
    return memoryCache.set(key, value, ttlSeconds);
  },

  /**
   * Delete a key from cache
   */
  async del(key) {
    await initRedis();
    if (redisAvailable && redisClient) {
      await redisClient.del(`ojawa:${key}`);
      return true;
    }
    return memoryCache.del(key);
  },

  /**
   * Delete keys matching a prefix pattern
   */
  async delPattern(pattern) {
    await initRedis();
    if (redisAvailable && redisClient) {
      const keys = await redisClient.keys(`ojawa:${pattern}`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    }
    return memoryCache.delPattern(pattern);
  },

  /**
   * Get or compute and cache a value
   */
  async getOrSet(key, factory, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const cached = await this.get(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }
};

module.exports = cache;
