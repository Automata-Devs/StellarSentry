/**
 * Cache Utility - Bounded TTL Cache with automatic cleanup
 * Thread-safe in-memory cache with TTL and max size limits
 */

class TTLCache {
  /**
   * Create a new TTL Cache
   * @param {Object} options
   * @param {number} options.maxSize - Maximum number of entries (default: 1000)
   * @param {number} options.defaultTTL - Default TTL in milliseconds (default: 5 minutes)
   * @param {number} options.cleanupInterval - Cleanup interval in milliseconds (default: 1 minute)
   */
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minute

    this.cache = new Map();
    this.timers = new Map();

    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupInterval);
    this.cleanupTimer.unref(); // Don't prevent process exit
  }

  /**
   * Set a value in the cache
   * @param {string} key
   * @param {*} value
   * @param {number} ttl - Time to live in milliseconds (optional)
   * @returns {boolean} True if set successfully
   */
  set(key, value, ttl = this.defaultTTL) {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    // Clear existing timer if key exists
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store value
    this.cache.set(key, value);

    // Set expiration timer
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);
      this.timers.set(key, timer);
    }

    return true;
  }

  /**
   * Get a value from the cache
   * @param {string} key
   * @returns {*|undefined}
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Check if key exists in cache
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Delete a key from the cache
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    const existed = this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return existed;
  }

  /**
   * Clear all entries
   */
  clear() {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  /**
   * Get cache size
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get all keys
   * @returns {string[]}
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values
   * @returns {*[]}
   */
  values() {
    return Array.from(this.cache.values());
  }

  /**
   * Get all entries
   * @returns {Array<[string, *]>}
   */
  entries() {
    return Array.from(this.cache.entries());
  }

  /**
   * Evict oldest entry (FIFO)
   */
  evictOldest() {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.delete(firstKey);
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    // Timers handle expiration automatically
    // This is a safety net for any missed timers
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      // If value has an expiration property, check it
      if (value && value._expiresAt && value._expiresAt <= now) {
        this.delete(key);
      }
    }
  }

  /**
   * Set a value with metadata
   * @param {string} key
   * @param {*} value
   * @param {number} ttl
   * @returns {boolean}
   */
  setWithMeta(key, value, ttl = this.defaultTTL) {
    const wrapper = {
      value,
      _expiresAt: ttl > 0 ? Date.now() + ttl : null,
      _createdAt: Date.now(),
    };
    return this.set(key, wrapper, ttl);
  }

  /**
   * Get value with metadata
   * @param {string} key
   * @returns {{value: *, _expiresAt: number, _createdAt: number}|undefined}
   */
  getWithMeta(key) {
    return this.cache.get(key);
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL,
      cleanupInterval: this.cleanupInterval,
      timerCount: this.timers.size,
    };
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy() {
    clearInterval(this.cleanupTimer);
    this.clear();
  }
}

/**
 * Multi-level cache for different data types
 */
class MultiCache {
  constructor() {
    this.caches = new Map();
  }

  /**
   * Get or create a named cache
   * @param {string} name
   * @param {Object} options
   * @returns {TTLCache}
   */
  getCache(name, options = {}) {
    if (!this.caches.has(name)) {
      this.caches.set(name, new TTLCache(options));
    }
    return this.caches.get(name);
  }

  /**
   * Clear all caches
   */
  clearAll() {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Destroy all caches
   */
  destroyAll() {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
  }
}

// Export singleton instances
export const multiCache = new MultiCache();

// Pre-configured caches for common use cases
export const guildSettingsCache = multiCache.getCache('guild-settings', {
  maxSize: 500,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
});

export const userProfileCache = multiCache.getCache('user-profile', {
  maxSize: 1000,
  defaultTTL: 2 * 60 * 1000, // 2 minutes
});

export const channelListCache = multiCache.getCache('channel-list', {
  maxSize: 200,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
});

export const roleListCache = multiCache.getCache('role-list', {
  maxSize: 200,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
});

export const lavalinkTrackCache = multiCache.getCache('lavalink-track', {
  maxSize: 500,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
});

export const dashboardStatsCache = multiCache.getCache('dashboard-stats', {
  maxSize: 100,
  defaultTTL: 1 * 60 * 1000, // 1 minute
});

export default TTLCache;