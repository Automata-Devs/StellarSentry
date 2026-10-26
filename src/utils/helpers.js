/**
 * General helper utilities
 */

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array
 * @param {Array} arr
 * @returns {*}
 */
export function randomChoice(arr) {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle an array in place (Fisher-Yates)
 * @param {Array} arr
 * @returns {Array} The same array, shuffled
 */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Chunk an array into smaller arrays of specified size
 * @param {Array} arr
 * @param {number} size
 * @returns {Array<Array>}
 */
export function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Deep clone an object
 * @param {*} obj
 * @returns {*}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if an object is empty
 * @param {Object} obj
 * @returns {boolean}
 */
export function isEmpty(obj) {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * Omit keys from an object
 * @param {Object} obj
 * @param {string[]} keys
 * @returns {Object}
 */
export function omit(obj, keys) {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Pick keys from an object
 * @param {Object} obj
 * @param {string[]} keys
 * @returns {Object}
 */
export function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/**
 * Capitalize first letter of a string
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to title case
 * @param {string} str
 * @returns {string}
 */
export function titleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Truncate string with ellipsis
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength) {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Format number with commas
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Format number as compact (1K, 1M, etc.)
 * @param {number} num
 * @returns {string}
 */
export function formatCompactNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options
 * @returns {Promise<*>}
 */
export async function retry(fn, options = {}) {
  const { retries = 3, baseDelay = 1000, maxDelay = 30000, factor = 2, shouldRetry = () => true } = options;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error)) break;

      const delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Debounce a function
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle a function
 * @param {Function} fn
 * @param {number} limit
 * @returns {Function}
 */
export function throttle(fn, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate a unique ID
 * @returns {string}
 */
export function generateId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Sanitize string for safe use in Discord embeds/messages
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitize(str, maxLength = 2000) {
  if (!str) return '';
  // Remove mentions, markdown, and control characters
  let sanitized = str
    .replace(/@(everyone|here)/g, '@​$1')
    .replace(/@&?\d+/g, '@​$&')
    .replace(/[_*~`|]/g, '\\$&')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength - 3) + '...';
  }
  return sanitized;
}

/**
 * Escape regex special characters
 * @param {string} str
 * @returns {string}
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse boolean from string
 * @param {string} str
 * @returns {boolean|null}
 */
export function parseBool(str) {
  if (str === 'true' || str === '1' || str === 'yes' || str === 'on') return true;
  if (str === 'false' || str === '0' || str === 'no' || str === 'off') return false;
  return null;
}

/**
 * Get nested property from object using dot notation
 * @param {Object} obj
 * @param {string} path
 * @param {*} defaultValue
 * @returns {*}
 */
export function get(obj, path, defaultValue = undefined) {
  if (!obj || !path) return defaultValue;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return defaultValue;
    current = current[key];
  }
  return current !== undefined ? current : defaultValue;
}

/**
 * Set nested property on object using dot notation
 * @param {Object} obj
 * @param {string} path
 * @param {*} value
 * @returns {Object}
 */
export function set(obj, path, value) {
  if (!obj || !path) return obj;
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return obj;
}

/**
 * Compare two values for sorting (handles null/undefined)
 * @param {*} a
 * @param {*} b
 * @returns {number}
 */
export function compare(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Sort array of objects by property
 * @param {Array} arr
 * @param {string} prop
 * @param {boolean} desc
 * @returns {Array}
 */
export function sortBy(arr, prop, desc = false) {
  return [...arr].sort((a, b) => {
    const result = compare(get(a, prop), get(b, prop));
    return desc ? -result : result;
  });
}

/**
 * Group array by property
 * @param {Array} arr
 * @param {string} prop
 * @returns {Object}
 */
export function groupBy(arr, prop) {
  return arr.reduce((groups, item) => {
    const key = get(item, prop);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * Calculate percentage
 * @param {number} value
 * @param {number} total
 * @param {number} decimals
 * @returns {number}
 */
export function percentage(value, total, decimals = 2) {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(decimals));
}

/**
 * Clamp a number between min and max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}