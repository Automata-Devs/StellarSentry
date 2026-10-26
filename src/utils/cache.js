/**
 * Bounded TTL Cache implementation
 * Memory-efficient cache with automatic expiration and size limits
 */

import { createChildLogger } from './logger.js';

const logger = createChildLogger({ module: 'cache' });

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {*} value - Cached value
 * @property {number} expiresAt - Expiration timestamp
 * @property {number} createdAt - Creation timestamp
 * @property {number} accessCount - Number of accesses
 * @property {number} lastAccessed - Last access timestamp
 */

/**
 * Bounded TTL Cache class
 */
export class TTLCache {
  /**
   * @param {Object} options
   * @param {number} options.maxSize - Maximum number of entries (default: 1000)
   * @param {number} options.defaultTTL - Default TTL in milliseconds (default: 5 minutes)
   * @param {number} options.cleanupInterval - Cleanup interval in milliseconds (default: 1 minute)
   */
  constructor(options = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.defaultTTL = options.defaultTTL ?? 5 * 60 * 1000;
    this.cleanupInterval = options.cleanupInterval ?? 60 * 1000;

    /** @type {Map<string, CacheEntry>} */
    this.cache = new Map();
    this.cleanupTimer = null;
    this.hits = 0;
    this.misses = 0;

    this.startCleanup();
  }

  /**
   * Generate a cache key from arguments
   * @param {...*} args - Arguments to generate key from
   * @returns {string}
   */
  static generateKey(...args) {
    return args.map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') return JSON.stringify(arg);
      return String(arg);
    }).join(':');
  }

  /**
   * Start periodic cleanup of expired entries
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupInterval);
    this.cleanupTimer.unref(); // Don't prevent process exit
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Remove expired entries
   * @returns {number} Number of removed entries
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug({ removed, size: this.cache.size }, 'Cache cleanup completed');
    }

    return removed;
  }

  /**
   * Evict least recently used entries if over max size
   */
  evictIfNeeded() {
    if (this.cache.size >= this.maxSize) {
      // Remove 10% of entries (LRU)
      const toRemove = Math.max(1, Math.floor(this.maxSize * 0.1));
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
        .slice(0, toRemove);

      for (const [key] of entries) {
        this.cache.delete(key);
      }

      logger.debug({ evicted: toRemove, size: this.cache.size }, 'Cache eviction completed');
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*|undefined} Cached value or undefined
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    const now = Date.now();
    if (entry.expiresAt <= now) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = now;
    this.hits++;

    return entry.value;
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - TTL in milliseconds (optional, uses default)
   * @returns {boolean} True if set successfully
   */
  set(key, value, ttl = this.defaultTTL) {
    this.evictIfNeeded();

    const now = Date.now();
    this.cache.set(key, {
      value,
      expiresAt: now + ttl,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now,
    });

    return true;
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      defaultTTL: this.defaultTTL,
    };
  }

  /**
   * Get all keys (for debugging)
   * @returns {string[]}
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Destroy the cache and cleanup
   */
  destroy() {
    this.stopCleanup();
    this.clear();
  }
}

/**
 * Multi-level cache with different TTLs per namespace
 */
export class MultiCache {
  constructor() {
    /** @type {Map<string, TTLCache>} */
    this.caches = new Map();
  }

  /**
   * Get or create a namespace cache
   * @param {string} namespace - Cache namespace
   * @param {Object} options - Cache options
   * @returns {TTLCache}
   */
  getCache(namespace, options = {}) {
    if (!this.caches.has(namespace)) {
      this.caches.set(namespace, new TTLCache(options));
    }
    return this.caches.get(namespace);
  }

  /**
   * Get value from namespace
   * @param {string} namespace - Cache namespace
   * @param {string} key - Cache key
   * @returns {*|undefined}
   */
  get(namespace, key) {
    const cache = this.caches.get(namespace);
    return cache?.get(key);
  }

  /**
   * Set value in namespace
   * @param {string} namespace - Cache namespace
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - TTL in milliseconds
   * @returns {boolean}
   */
  set(namespace, key, value, ttl) {
    const cache = this.getCache(namespace);
    return cache.set(key, value, ttl);
  }

  /**
   * Delete value from namespace
   * @param {string} namespace - Cache namespace
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  delete(namespace, key) {
    const cache = this.caches.get(namespace);
    return cache?.delete(key) ?? false;
  }

  /**
   * Clear namespace
   * @param {string} namespace - Cache namespace
   */
  clear(namespace) {
    const cache = this.caches.get(namespace);
    cache?.clear();
  }

  /**
   * Clear all namespaces
   */
  clearAll() {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Destroy all caches
   */
  destroy() {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
  }

  /**
   * Get combined stats
   * @returns {Object}
   */
  getStats() {
    const stats = {};
    for (const [namespace, cache] of this.caches.entries()) {
      stats[namespace] = cache.getStats();
    }
    return stats;
  }
}

// Global multi-cache instance
export const multiCache = new MultiCache();

/**
 * Cache decorator for async functions
 * @param {Object} options
 * @param {string} options.namespace - Cache namespace
 * @param {number} options.ttl - TTL in milliseconds
 * @param {(...args) => string} options.keyGenerator - Function to generate cache key from args
 * @returns {Function} Decorated function
 */
export function cached(options) {
  const { namespace, ttl, keyGenerator = TTLCache.generateKey } = options;

  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const cache = multiCache.getCache(namespace);
      const key = keyGenerator(...args);

      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      cache.set(key, result, ttl);
      return result;
    };

    return descriptor;
  };
}

/**
 * Simple memoize function for synchronous functions
 * @param {Function} fn - Function to memoize
 * @param {Object} options
 * @returns {Function}
 */
export function memoize(fn, options = {}) {
  const { maxSize = 100, ttl = 5 * 60 * 1000 } = options;
  const cache = new TTLCache({ maxSize, defaultTTL: ttl });

  return function (...args) {
    const key = TTLCache.generateKey(...args);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}