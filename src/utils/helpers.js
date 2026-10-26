/**
 * Helper Utilities - Common utility functions
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
 * Generate a random string of specified length
 * @param {number} length
 * @param {string} charset
 * @returns {string}
 */
export function randomString(length = 32, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * Generate a UUID v4
 * @returns {string}
 */
export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Deep clone an object
 * @param {Object} obj
 * @returns {Object}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge two objects deeply
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
export function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}

/**
 * Check if value is a plain object
 * @param {*} item
 * @returns {boolean}
 */
export function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Chunk an array into smaller arrays
 * @param {Array} array
 * @param {number} size
 * @returns {Array<Array>}
 */
export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Shuffle an array (Fisher-Yates)
 * @param {Array} array
 * @returns {Array}
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Pick random elements from array
 * @param {Array} array
 * @param {number} count
 * @returns {Array}
 */
export function pickRandom(array, count) {
  if (count >= array.length) return [...array];
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}

/**
 * Capitalize first letter of string
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to kebab-case
 * @param {string} str
 * @returns {string}
 */
export function kebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to PascalCase
 * @param {string} str
 * @returns {string}
 */
export function pascalCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toUpperCase());
}

/**
 * Convert string to camelCase
 * @param {string} str
 * @returns {string}
 */
export function camelCase(str) {
  const pascal = pascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Truncate string to max length
 * @param {string} str
 * @param {number} maxLength
 * @param {string} suffix
 * @returns {string}
 */
export function truncate(str, maxLength = 100, suffix = '...') {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Escape markdown special characters
 * @param {string} text
 * @returns {string}
 */
export function escapeMarkdown(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\|/g, '\\|');
}

/**
 * Escape mentions in text
 * @param {string} text
 * @returns {string}
 */
export function escapeMentions(text) {
  return text
    .replace(/@everyone/g, '@​everyone')
    .replace(/@here/g, '@​here')
    .replace(/<@!?(\d+)>/g, '<@​$1>')
    .replace(/<@&(\d+)>/g, '<@&​$1>')
    .replace(/<#(\d+)>/g, '<#​$1>');
}

/**
 * Clean text for safe embedding
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function cleanForEmbed(text, maxLength = 4096) {
  let cleaned = escapeMentions(text);
  if (cleaned.length > maxLength) {
    cleaned = truncate(cleaned, maxLength);
  }
  return cleaned;
}

/**
 * Format number with commas
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format bytes to human readable
 * @param {number} bytes
 * @param {number} decimals
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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
 * @param {Function} fn
 * @param {number} retries
 * @param {number} delay
 * @returns {Promise<any>}
 */
export async function retry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await sleep(delay);
    return retry(fn, retries - 1, delay * 2);
  }
}

/**
 * Debounce a function
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
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
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Generate a secure random token
 * @param {number} length
 * @returns {string}
 */
export function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate Discord snowflake
 * @param {string} snowflake
 * @returns {boolean}
 */
export function isValidSnowflake(snowflake) {
  return /^\d{17,19}$/.test(snowflake);
}

/**
 * Extract Discord snowflake from mention
 * @param {string} mention
 * @returns {string|null}
 */
export function extractSnowflake(mention) {
  const match = mention.match(/<@!?(\d+)>|<@&(\d+)>|<#(\d+)>/);
  return match ? (match[1] || match[2] || match[3]) : null;
}

/**
 * Get color from string (deterministic)
 * @param {string} str
 * @returns {number}
 */
export function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return hue;
}

/**
 * Generate gradient colors
 * @param {number} count
 * @returns {string[]}
 */
export function generateGradientColors(count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * 360 / count) % 360;
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  return colors;
}

export default {
  randomInt,
  randomString,
  uuidv4,
  deepClone,
  deepMerge,
  isObject,
  chunkArray,
  shuffleArray,
  pickRandom,
  capitalize,
  kebabCase,
  pascalCase,
  camelCase,
  truncate,
  escapeMarkdown,
  escapeMentions,
  cleanForEmbed,
  formatNumber,
  formatBytes,
  sleep,
  retry,
  debounce,
  throttle,
  generateToken,
  isValidSnowflake,
  extractSnowflake,
  stringToColor,
  generateGradientColors,
};