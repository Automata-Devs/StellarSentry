/**
 * Cron Utility - Simple cron job scheduler
 * Lightweight wrapper around node-cron for scheduled tasks
 */

import cron from 'node-cron';

/**
 * Schedule a cron job
 * @param {string} expression - Cron expression (e.g., '0 * * * *' for every hour)
 * @param {Function} task - Async function to execute
 * @param {Object} options - Options for the cron job
 * @returns {Object} Scheduled task object with stop method
 */
export function scheduleCron(expression, task, options = {}) {
  const job = cron.schedule(expression, async () => {
    try {
      await task();
    } catch (error) {
      console.error('[Cron] Task error:', error);
    }
  }, {
    scheduled: options.scheduled !== false,
    timezone: options.timezone || 'UTC',
  });

  return {
    stop: () => job.stop(),
    start: () => job.start(),
    get status() {
      return job.getStatus();
    },
  };
}

/**
 * Schedule a task to run at a specific date/time
 * @param {Date|string|number} date - When to run the task
 * @param {Function} task - Async function to execute
 * @returns {Object} Scheduled task object with stop method
 */
export function scheduleAt(date, task) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();

  if (dateObj <= now) {
    // Run immediately if in the past
    setImmediate(async () => {
      try {
        await task();
      } catch (error) {
        console.error('[Scheduler] Immediate task error:', error);
      }
    });
    return { stop: () => {} };
  }

  const delay = dateObj.getTime() - now.getTime();
  const timeoutId = setTimeout(async () => {
    try {
      await task();
    } catch (error) {
      console.error('[Scheduler] Delayed task error:', error);
    }
  }, delay);

  return {
    stop: () => clearTimeout(timeoutId),
  };
}

/**
 * Schedule a recurring task at a fixed interval
 * @param {number} intervalMs - Interval in milliseconds
 * @param {Function} task - Async function to execute
 * @param {boolean} immediate - Whether to run immediately
 * @returns {Object} Scheduled task object with stop method
 */
export function scheduleInterval(intervalMs, task, immediate = false) {
  if (immediate) {
    task().catch(console.error);
  }

  const intervalId = setInterval(async () => {
    try {
      await task();
    } catch (error) {
      console.error('[Interval] Task error:', error);
    }
  }, intervalMs);

  return {
    stop: () => clearInterval(intervalId),
  };
}

/**
 * Parse cron expression to human readable format
 * @param {string} expression - Cron expression
 * @returns {string} Human readable description
 */
export function describeCron(expression) {
  const parts = expression.split(' ');
  if (parts.length !== 5) return expression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const descriptions = [];

  if (minute !== '*') {
    descriptions.push(`at minute ${minute}`);
  }
  if (hour !== '*') {
    descriptions.push(`at hour ${hour}`);
  }
  if (dayOfMonth !== '*') {
    descriptions.push(`on day ${dayOfMonth} of the month`);
  }
  if (month !== '*') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    descriptions.push(`in ${months[parseInt(month) - 1]}`);
  }
  if (dayOfWeek !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    descriptions.push(`on ${days[parseInt(dayOfWeek)]}`);
  }

  if (descriptions.length === 0) return 'Every minute';

  return `Run ${descriptions.join(', ')}`;
}

/**
 * Validate cron expression
 * @param {string} expression - Cron expression to validate
 * @returns {boolean} True if valid
 */
export function validateCron(expression) {
  try {
    cron.validate(expression);
    return true;
  } catch {
    return false;
  }
}

/**
 * Common cron expressions
 */
export const CRON = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_10_MINUTES: '*/10 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  HOURLY: '0 * * * *',
  EVERY_2_HOURS: '0 */2 * * *',
  EVERY_6_HOURS: '0 */6 * * *',
  DAILY_MIDNIGHT: '0 0 * * *',
  DAILY_NOON: '0 12 * * *',
  WEEKLY: '0 0 * * 0',
  MONTHLY: '0 0 1 * *',
  YEARLY: '0 0 1 1 *',
};

export default {
  scheduleCron,
  scheduleAt,
  scheduleInterval,
  describeCron,
  validateCron,
  CRON,
};