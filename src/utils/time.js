/**
 * Time Utility - Parse and format time strings
 * Supports formats like: 1s, 30s, 5m, 1h, 2d, 1w, 1y, 1h30m, 1d2h30m
 */

/**
 * Parse time string to milliseconds
 * @param {string} timeStr - Time string (e.g., '1h30m', '5m', '2d')
 * @returns {number|null} Milliseconds or null if invalid
 */
export function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const str = timeStr.trim().toLowerCase();
  if (!str) return null;

  // Handle "off" or "0"
  if (str === 'off' || str === '0' || str === 'none') return 0;

  // Try parsing as ISO date first
  const date = new Date(timeStr);
  if (!isNaN(date.getTime())) {
    const diff = date.getTime() - Date.now();
    return diff > 0 ? diff : null;
  }

  // Parse relative time formats
  const regex = /(?:(\d+)y)?(?:(\d+)w)?(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i;
  const match = str.match(regex);

  if (!match) return null;

  const [, years, weeks, days, hours, minutes, seconds] = match;

  let totalMs = 0;
  if (years) totalMs += parseInt(years) * 365 * 24 * 60 * 60 * 1000;
  if (weeks) totalMs += parseInt(weeks) * 7 * 24 * 60 * 60 * 1000;
  if (days) totalMs += parseInt(days) * 24 * 60 * 60 * 1000;
  if (hours) totalMs += parseInt(hours) * 60 * 60 * 1000;
  if (minutes) totalMs += parseInt(minutes) * 60 * 1000;
  if (seconds) totalMs += parseInt(seconds) * 1000;

  return totalMs > 0 ? totalMs : null;
}

/**
 * Format milliseconds to human readable string
 * @param {number} ms - Milliseconds
 * @param {Object} options
 * @returns {string}
 */
export function formatTime(ms, options = {}) {
  const {
    short = false,
    maxUnits = 2,
    compact = false,
  } = options;

  if (!ms || ms <= 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const years = Math.floor(days / 365);

  const parts = [];

  if (years > 0) parts.push({ value: years, unit: 'y', short: 'y', long: 'year' });
  if (weeks > 0) parts.push({ value: weeks, unit: 'w', short: 'w', long: 'week' });
  if (days > 0) parts.push({ value: days, unit: 'd', short: 'd', long: 'day' });
  if (hours > 0) parts.push({ value: hours, unit: 'h', short: 'h', long: 'hour' });
  if (minutes > 0) parts.push({ value: minutes, unit: 'm', short: 'm', long: 'minute' });
  if (seconds > 0 && parts.length < maxUnits) parts.push({ value: seconds, unit: 's', short: 's', long: 'second' });

  if (parts.length === 0) return '0s';

  // Limit to maxUnits
  const limitedParts = parts.slice(0, maxUnits);

  if (compact) {
    return limitedParts.map(p => `${p.value}${p.short}`).join(' ');
  }

  if (short) {
    return limitedParts.map(p => `${p.value}${p.short}`).join(' ');
  }

  return limitedParts.map(p =>
    `${p.value} ${p.long}${p.value !== 1 ? 's' : ''}`
  ).join(', ');
}

/**
 * Format time for Discord timestamp
 * @param {Date|number} date
 * @param {string} style - 't', 'T', 'd', 'D', 'f', 'F', 'R'
 * @returns {string}
 */
export function discordTimestamp(date, style = 'f') {
  const timestamp = date instanceof Date ? Math.floor(date.getTime() / 1000) : Math.floor(date / 1000);
  return `<t:${timestamp}:${style}>`;
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {Date|number} date
 * @returns {string}
 */
export function relativeTime(date) {
  const diff = Date.now() - (date instanceof Date ? date.getTime() : date);

  if (diff < 0) return 'in the future';

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Format duration for display (hh:mm:ss or mm:ss)
 * @param {number} ms - Milliseconds
 * @returns {string}
 */
export function formatDuration(ms) {
  if (!ms || ms <= 0) return '0:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parse Discord snowflake to date
 * @param {string} snowflake
 * @returns {Date}
 */
export function snowflakeToDate(snowflake) {
  const timestamp = (BigInt(snowflake) >> 22n) + 1420070400000n;
  return new Date(Number(timestamp));
}

/**
 * Get time remaining until a date
 * @param {Date|number} targetDate
 * @returns {Object} { days, hours, minutes, seconds, totalMs }
 */
export function getTimeRemaining(targetDate) {
  const totalMs = (targetDate instanceof Date ? targetDate.getTime() : targetDate) - Date.now();

  if (totalMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, expired: true };
  }

  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, totalMs, expired: false };
}

/**
 * Check if a time string is valid
 * @param {string} timeStr
 * @returns {boolean}
 */
export function isValidTime(timeStr) {
  return parseTime(timeStr) !== null;
}

/**
 * Convert milliseconds to human readable with locale
 * @param {number} ms
 * @param {string} locale
 * @returns {string}
 */
export function formatTimeLocale(ms, locale = 'en-US') {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return formatter.format(-seconds, 'second');

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return formatter.format(-minutes, 'minute');

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatter.format(-hours, 'hour');

  const days = Math.floor(hours / 24);
  if (days < 30) return formatter.format(-days, 'day');

  const months = Math.floor(days / 30);
  if (months < 12) return formatter.format(-months, 'month');

  const years = Math.floor(days / 365);
  return formatter.format(-years, 'year');
}

export default {
  parseTime,
  formatTime,
  discordTimestamp,
  relativeTime,
  formatDuration,
  snowflakeToDate,
  getTimeRemaining,
  isValidTime,
  formatTimeLocale,
};