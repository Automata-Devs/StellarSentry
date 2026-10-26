/**
 * Cooldown management system
 * Handles user, guild, and global cooldowns for commands
 */
import { Collection } from 'discord.js';
import { COOLDOWNS } from '../config/constants.js';
import { multiCache, TTLCache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';

/**
 * Cooldown types
 */
export const COOLDOWN_TYPES = {
  USER: 'user',
  GUILD: 'guild',
  CHANNEL: 'channel',
  GLOBAL: 'global',
};

/**
 * Cooldown manager class
 */
export class CooldownManager {
  constructor() {
    this.cooldowns = new Collection();
    this.cache = multiCache.getCache('cooldowns', { maxSize: 10000, defaultTTL: 24 * 60 * 60 * 1000 });
  }

  /**
   * Generate cache key
   * @param {string} type
   * @param {string} commandName
   * @param {string} id
   * @returns {string}
   */
  getKey(type, commandName, id) {
    return `cooldown:${type}:${commandName}:${id}`;
  }

  /**
   * Check if on cooldown
   * @param {Object} interaction
   * @param {Object} command
   * @returns {Object} { onCooldown: boolean, remaining: number, resetAt: number }
   */
  check(interaction, command) {
    const { user, guild, channel } = interaction;
    const commandName = command.data.name;
    const cooldown = command.cooldown || COOLDOWNS.DEFAULT;
    const type = command.cooldownType || COOLDOWN_TYPES.USER;

    let id;
    switch (type) {
      case COOLDOWN_TYPES.GUILD:
        id = guild?.id;
        break;
      case COOLDOWN_TYPES.CHANNEL:
        id = channel?.id;
        break;
      case COOLDOWN_TYPES.GLOBAL:
        id = 'global';
        break;
      case COOLDOWN_TYPES.USER:
      default:
        id = user.id;
    }

    if (!id) return { onCooldown: false, remaining: 0, resetAt: 0 };

    const key = this.getKey(type, commandName, id);
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached > now) {
      return {
        onCooldown: true,
        remaining: cached - now,
        resetAt: cached,
      };
    }

    return { onCooldown: false, remaining: 0, resetAt: 0 };
  }

  /**
   * Set cooldown
   * @param {Object} interaction
   * @param {Object} command
   * @param {number} customCooldown - Optional custom cooldown in seconds
   */
  set(interaction, command, customCooldown = null) {
    const { user, guild, channel } = interaction;
    const commandName = command.data.name;
    const cooldown = customCooldown || command.cooldown || COOLDOWNS.DEFAULT;
    const type = command.cooldownType || COOLDOWN_TYPES.USER;

    let id;
    switch (type) {
      case COOLDOWN_TYPES.GUILD:
        id = guild?.id;
        break;
      case COOLDOWN_TYPES.CHANNEL:
        id = channel?.id;
        break;
      case COOLDOWN_TYPES.GLOBAL:
        id = 'global';
        break;
      case COOLDOWN_TYPES.USER:
      default:
        id = user.id;
    }

    if (!id) return;

    const key = this.getKey(type, commandName, id);
    const resetAt = Date.now() + cooldown * 1000;

    this.cache.set(key, resetAt, cooldown * 1000);
  }

  /**
   * Clear cooldown
   * @param {Object} interaction
   * @param {Object} command
   */
  clear(interaction, command) {
    const { user, guild, channel } = interaction;
    const commandName = command.data.name;
    const type = command.cooldownType || COOLDOWN_TYPES.USER;

    let id;
    switch (type) {
      case COOLDOWN_TYPES.GUILD:
        id = guild?.id;
        break;
      case COOLDOWN_TYPES.CHANNEL:
        id = channel?.id;
        break;
      case COOLDOWN_TYPES.GLOBAL:
        id = 'global';
        break;
      case COOLDOWN_TYPES.USER:
      default:
        id = user.id;
    }

    if (!id) return;

    const key = this.getKey(type, commandName, id);
    this.cache.delete(key);
  }

  /**
   * Get remaining cooldown time in milliseconds
   * @param {Object} interaction
   * @param {Object} command
   * @returns {number}
   */
  getRemaining(interaction, command) {
    const result = this.check(interaction, command);
    return result.remaining;
  }

  /**
   * Format remaining time for display
   * @param {number} ms
   * @returns {string}
   */
  formatRemaining(ms) {
    if (ms <= 0) return '0s';
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Get all active cooldowns for a user
   * @param {string} userId
   * @returns {Array}
   */
  getUserCooldowns(userId) {
    const results = [];
    for (const [key, value] of this.cache.cache.entries()) {
      if (key.includes(`:${userId}`) || key.endsWith(`:global`)) {
        results.push({ key, resetAt: value });
      }
    }
    return results;
  }

  /**
   * Clear all cooldowns for a user
   * @param {string} userId
   */
  clearUserCooldowns(userId) {
    for (const key of this.cache.keys()) {
      if (key.includes(`:${userId}`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cooldown stats
   * @returns {Object}
   */
  getStats() {
    return this.cache.getStats();
  }
}

// Export singleton instance
export const cooldownManager = new CooldownManager();

/**
 * Decorator for adding cooldown to command
 * @param {number} seconds
 * @param {string} type
 * @returns {Function}
 */
export function cooldown(seconds, type = COOLDOWN_TYPES.USER) {
  return function (target, propertyKey, descriptor) {
    const originalExecute = descriptor.value;
    descriptor.value = async function (interaction, client) {
      const command = { data: { name: propertyKey }, cooldown: seconds, cooldownType: type };
      const result = cooldownManager.check(interaction, command);

      if (result.onCooldown) {
        const timeLeft = cooldownManager.formatRemaining(result.remaining);
        return interaction.reply({
          content: `⏳ Please wait **${timeLeft}** before using this command again.`,
          ephemeral: true,
        });
      }

      cooldownManager.set(interaction, command);
      return originalExecute.call(this, interaction, client);
    };
    return descriptor;
  };
}

export default cooldownManager;