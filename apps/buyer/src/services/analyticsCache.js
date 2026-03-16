/**
 * Analytics Cache Service
 * 
 * Provides a caching layer for analytics queries with configurable TTL,
 * invalidation strategies, and automatic cleanup.
 * Reduces Firestore reads and improves dashboard performance.
 * 
 * Cache Strategies:
 * - TTL (Time To Live): Cache expires after specified duration
 * - LRU (Least Recently Used): Removes oldest accessed items when limit exceeded
 * - Smart Invalidation: Automatic cache bust on data changes
 * 
 * Usage:
 *   const cache = analyticsCache;
 *   
 *   // Set cache
 *   cache.set('vendor:overview', data, 300000); // 5 minutes
 *   
 *   // Get with fallback
 *   const data = cache.get('vendor:overview') || await fetchFresh();
 *   
 *   // Invalidate specific pattern
 *   cache.invalidate('vendor:*');
 *   
 *   // Cleanup
 *   cache.cleanup();
 */

class AnalyticsCacheService {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttls = new Map();
    this.accessTimes = new Map();
    this.accessCounts = new Map();
    
    // Configuration
    this.maxSize = options.maxSize || 1000; // Max cache entries
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute
    this.compressionEnabled = options.compressionEnabled !== false;
    
    // Start cleanup interval
    this.startCleanup();
    
    // Track cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      invalidations: 0
    };
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in ms (optional)
   * @returns {boolean} Success status
   */
  set(key, value, ttl = this.defaultTTL) {
    try {
      // Check cache size limit
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }

      this.cache.set(key, value);
      this.ttls.set(key, Date.now() + ttl);
      this.accessTimes.set(key, Date.now());
      this.accessCounts.set(key, 0);
      
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get cache value
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/missing
   */
  get(key) {
    try {
      // Check expiration
      const expiresAt = this.ttls.get(key);
      if (expiresAt && Date.now() > expiresAt) {
        this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Return cached value
      if (this.cache.has(key)) {
        this.accessTimes.set(key, Date.now());
        const count = this.accessCounts.get(key) || 0;
        this.accessCounts.set(key, count + 1);
        this.stats.hits++;
        return this.cache.get(key);
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Get with fallback function
   * @param {string} key - Cache key
   * @param {Function} fallback - Function to call if cache miss
   * @param {number} ttl - TTL for cached result
   * @returns {Promise<any>} Cached or fresh value
   */
  async getOrSet(key, fallback, ttl = this.defaultTTL) {
    try {
      const cached = this.get(key);
      if (cached !== null) {
        return cached;
      }

      const fresh = await fallback();
      this.set(key, fresh, ttl);
      return fresh;
    } catch (error) {
      console.error('Cache getOrSet error:', error);
      return await fallback();
    }
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.ttls.delete(key);
      this.accessTimes.delete(key);
      this.accessCounts.delete(key);
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   * @returns {number} Number of keys invalidated
   */
  invalidate(pattern) {
    try {
      const regex = this.patternToRegex(pattern);
      let count = 0;

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.delete(key);
          count++;
        }
      }

      this.stats.invalidations += count;
      return count;
    } catch (error) {
      console.error('Cache invalidate error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache
   * @returns {number} Number of entries cleared
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.ttls.clear();
    this.accessTimes.clear();
    this.accessCounts.clear();
    this.stats.deletes += size;
    return size;
  }

  /**
   * Get cache size
   * @returns {number} Number of entries
   */
  size() {
    return this.cache.size;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if valid cache exists
   */
  has(key) {
    const expiresAt = this.ttls.get(key);
    if (expiresAt && Date.now() > expiresAt) {
      this.delete(key);
      return false;
    }
    return this.cache.has(key);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      invalidations: 0
    };
  }

  /**
   * Evict least recently used entry
   * @private
   */
  evictLRU() {
    let lruKey = null;
    let lruTime = Infinity;
    let lruCount = Infinity;

    for (const [key, accessTime] of this.accessTimes) {
      const accessCount = this.accessCounts.get(key) || 0;
      // Score: older access time + lower access count = higher eviction priority
      const score = accessTime + (accessCount * 1000);
      if (score < lruTime + lruCount) {
        lruKey = key;
        lruTime = accessTime;
        lruCount = accessCount;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Cleanup expired entries
   * @private
   */
  expireOldEntries() {
    const now = Date.now();
    const toDelete = [];

    for (const [key, expiresAt] of this.ttls) {
      if (now > expiresAt) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.delete(key));
    return toDelete.length;
  }

  /**
   * Start periodic cleanup
   * @private
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.expireOldEntries();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup and clear cache
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }

  /**
   * Get all keys matching pattern
   * @param {string} pattern - Pattern to match
   * @returns {string[]} Matching keys
   */
  getKeys(pattern = '*') {
    const regex = this.patternToRegex(pattern);
    const keys = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Get all cached data (with expiration info)
   * @returns {Object} All cache entries with metadata
   */
  getAll() {
    const result = {};
    
    for (const [key, value] of this.cache) {
      result[key] = {
        value,
        expiresAt: this.ttls.get(key),
        expiresIn: Math.max(0, this.ttls.get(key) - Date.now()),
        accessCount: this.accessCounts.get(key),
        lastAccess: this.accessTimes.get(key)
      };
    }

    return result;
  }

  /**
   * Convert wildcard pattern to regex
   * @private
   */
  patternToRegex(pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\*/g, '.*');
    return new RegExp(`^${regex}$`);
  }
}

// Export singleton instance
export const analyticsCache = new AnalyticsCacheService({
  maxSize: 500,
  defaultTTL: 300000, // 5 minutes
  cleanupInterval: 60000 // 1 minute
});

export default analyticsCache;
