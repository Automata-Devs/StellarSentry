/**
 * Internal Event Bus for communication between bot and dashboard
 * Uses EventEmitter for decoupled communication
 */
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

/**
 * Custom EventEmitter with logging and error handling
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Allow many listeners
    this.eventLog = [];
    this.maxLogSize = 1000;
  }

  /**
   * Emit an event with logging
   * @param {string} eventName
   * @param {...*} args
   * @returns {boolean}
   */
  emit(eventName, ...args) {
    // Log event (in development)
    if (process.env.NODE_ENV === 'development') {
      this.logEvent(eventName, args);
    }

    try {
      return super.emit(eventName, ...args);
    } catch (error) {
      logger.error({ eventName, err: error }, 'Event emission error');
      return false;
    }
  }

  /**
   * Emit event asynchronously (waits for all async listeners)
   * @param {string} eventName
   * @param {...*} args
   * @returns {Promise<void>}
   */
  async emitAsync(eventName, ...args) {
    const listeners = this.listeners(eventName);
    if (listeners.length === 0) return;

    const promises = listeners.map(listener => {
      try {
        const result = listener(...args);
        return result instanceof Promise ? result : Promise.resolve(result);
      } catch (error) {
        logger.error({ eventName, err: error }, 'Async listener error');
        return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Log event for debugging
   * @param {string} eventName
   * @param {Array} args
   */
  logEvent(eventName, args) {
    const entry = {
      event: eventName,
      timestamp: new Date().toISOString(),
      argCount: args.length,
      args: args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          return { type: arg.constructor?.name || 'Object', keys: Object.keys(arg) };
        }
        return typeof arg;
      }),
    };

    this.eventLog.push(entry);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }
  }

  /**
   * Get recent event log
   * @param {number} limit
   * @returns {Array}
   */
  getEventLog(limit = 100) {
    return this.eventLog.slice(-limit);
  }

  /**
   * Clear event log
   */
  clearEventLog() {
    this.eventLog = [];
  }

  /**
   * Subscribe to events matching a pattern
   * @param {string|RegExp} pattern
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(pattern, listener) {
    const handler = (eventName, ...args) => {
      if (pattern instanceof RegExp ? pattern.test(eventName) : eventName === pattern) {
        listener(eventName, ...args);
      }
    };

    this.on('*', handler); // We'll need to override emit for this to work

    return () => this.off('*', handler);
  }

  /**
   * Wait for an event to be emitted
   * @param {string} eventName
   * @param {number} timeout
   * @returns {Promise<Array>}
   */
  waitFor(eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(eventName, handler);
        reject(new Error(`Timeout waiting for ${eventName}`));
      }, timeout);

      const handler = (...args) => {
        clearTimeout(timer);
        this.off(eventName, handler);
        resolve(args);
      };

      this.once(eventName, handler);
    });
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Event name constants for type safety
export const EVENTS = {
  // Bot events
  BOT_READY: 'bot:ready',
  BOT_DISCONNECT: 'bot:disconnect',
  BOT_RECONNECTING: 'bot:reconnecting',
  BOT_SHUTDOWN: 'bot:shutdown',

  // Guild events
  GUILD_CREATE: 'guild:create',
  GUILD_DELETE: 'guild:delete',
  GUILD_UPDATE: 'guild:update',
  GUILD_MEMBER_ADD: 'guild:member:add',
  GUILD_MEMBER_REMOVE: 'guild:member:remove',
  GUILD_MEMBER_UPDATE: 'guild:member:update',

  // Settings events
  SETTING_UPDATE: 'setting:update',
  FEATURE_TOGGLE: 'feature:toggle',
  COMMAND_TOGGLE: 'command:toggle',

  // Music events
  MUSIC_PLAY: 'music:play',
  MUSIC_PAUSE: 'music:pause',
  MUSIC_RESUME: 'music:resume',
  MUSIC_SKIP: 'music:skip',
  MUSIC_STOP: 'music:stop',
  MUSIC_QUEUE_UPDATE: 'music:queue_update',
  MUSIC_NOW_PLAYING: 'music:now_playing',
  MUSIC_VOLUME: 'music:volume',
  MUSIC_LOOP: 'music:loop',
  MUSIC_SHUFFLE: 'music:shuffle',
  MUSIC_ERROR: 'music:error',

  // Giveaway events
  GIVEAWAY_START: 'giveaway:start',
  GIVEAWAY_END: 'giveaway:end',
  GIVEAWAY_REROLL: 'giveaway:reroll',
  GIVEAWAY_ENTRY: 'giveaway:entry',

  // Ticket events
  TICKET_CREATE: 'ticket:create',
  TICKET_CLOSE: 'ticket:close',
  TICKET_REOPEN: 'ticket:reopen',
  TICKET_CLAIM: 'ticket:claim',
  TICKET_MESSAGE: 'ticket:message',

  // Logging events
  LOG_ENTRY: 'log:entry',
  LOG_CLEANUP: 'log:cleanup',

  // Leveling events
  LEVEL_UP: 'level:up',
  ROLE_REWARD: 'level:role_reward',

  // Economy events
  ECONOMY_DAILY: 'economy:daily',
  ECONOMY_WORK: 'economy:work',
  ECONOMY_PAY: 'economy:pay',
  ECONOMY_BUY: 'economy:buy',

  // Moderation events
  MOD_WARN: 'mod:warn',
  MOD_TIMEOUT: 'mod:timeout',
  MOD_BAN: 'mod:ban',
  MOD_KICK: 'mod:kick',
  MOD_PURGE: 'mod:purge',

  // Suggestion events
  SUGGESTION_CREATE: 'suggestion:create',
  SUGGESTION_APPROVE: 'suggestion:approve',
  SUGGESTION_DENY: 'suggestion:deny',
  SUGGESTION_CONSIDER: 'suggestion:consider',

  // Starboard events
  STARBOARD_ADD: 'starboard:add',
  STARBOARD_REMOVE: 'starboard:remove',

  // Dashboard events
  DASHBOARD_USER_LOGIN: 'dashboard:user:login',
  DASHBOARD_USER_LOGOUT: 'dashboard:user:logout',
  DASHBOARD_SETTINGS_SAVE: 'dashboard:settings:save',
};

export default eventBus;