/**
 * Time parsing and formatting utilities
 */

/**
 * Parse a time string (e.g., "1h30m", "2d", "30s") to milliseconds
 * @param {string} timeStr - Time string to parse
 * @returns {number} Milliseconds
 */
export function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;

  const regex = /(\d+)([dhms])/g;
  let match;
  let total = 0;

  while ((match = regex.exec(timeStr)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd': total += value * 24 * 60 * 60 * 1000; break;
      case 'h': total += value * 60 * 60 * 1000; break;
      case 'm': total += value * 60 * 1000; break;
      case 's': total += value * 1000; break;
    }
  }

  return total;
}

/**
 * Format milliseconds to human readable string
 * @param {number} ms - Milliseconds
 * @param {Object} options - Formatting options
 * @returns {string}
 */
export function formatTime(ms, options = {}) {
  const { short = false, maxUnits = 2 } = options;

  if (ms <= 0) return short ? '0s' : '0 seconds';

  const units = [
    { name: short ? 'd' : 'day', ms: 24 * 60 * 60 * 1000 },
    { name: short ? 'h' : 'hour', ms: 60 * 60 * 1000 },
    { name: short ? 'm' : 'minute', ms: 60 * 1000 },
    { name: short ? 's' : 'second', ms: 1000 },
  ];

  const parts = [];
  let remaining = ms;

  for (const unit of units) {
    if (parts.length >= maxUnits) break;

    const value = Math.floor(remaining / unit.ms);
    if (value > 0) {
      parts.push(`${value}${short ? '' : ' '}${unit.name}${short ? '' : value !== 1 ? 's' : ''}`);
      remaining -= value * unit.ms;
    }
  }

  return parts.join(short ? ' ' : ', ') || (short ? '0s' : '0 seconds');
}

/**
 * Format a Date to Discord timestamp format
 * @param {Date|number} date - Date or timestamp
 * @param {string} style - Discord timestamp style (t, T, d, D, f, F, R)
 * @returns {string}
 */
export function discordTimestamp(date, style = 'F') {
  const timestamp = date instanceof Date ? Math.floor(date.getTime() / 1000) : Math.floor(date / 1000);
  return `<t:${timestamp}:${style}>`;
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {Date|number} date - Date or timestamp
 * @returns {string}
 */
export function relativeTime(date) {
  const timestamp = date instanceof Date ? date.getTime() : date;
  const diff = Date.now() - timestamp;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  if (diff < 2592000000) return `${Math.floor(diff / 604800000)} weeks ago`;

  return `${Math.floor(diff / 31536000000)} years ago`;
}

/**
 * Format milliseconds to MM:SS or HH:MM:SS
 * @param {number} ms - Milliseconds
 * @returns {string}
 */
export function formatDuration(ms) {
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
 * Get start of day timestamp
 * @param {Date} date - Date (defaults to now)
 * @returns {number}
 */
export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Get end of day timestamp
 * @param {Date} date - Date (defaults to now)
 * @returns {number}
 */
export function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Add time to a date
 * @param {Date} date - Base date
 * @param {number} ms - Milliseconds to add
 * @returns {Date}
 */
export function addTime(date, ms) {
  return new Date(date.getTime() + ms);
}

/**
 * Check if a date is in the past
 * @param {Date} date - Date to check
 * @returns {boolean}
 */
export function isPast(date) {
  return date.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 * @param {Date} date - Date to check
 * @returns {boolean}
 */
export function isFuture(date) {
  return date.getTime() > Date.now();
}