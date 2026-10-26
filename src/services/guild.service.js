/**
 * Guild Service - Business logic for guild management
 * Handles guild settings, features, and configuration
 */
import { guildRepository } from '../database/repositories/GuildRepository.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { logger } from '../utils/logger.js';
import { getFeatureDefault, getFeatureKeys } from '../config/features.js';

class GuildService {
  /**
   * Get guild settings (with caching)
   * @param {string} guildId
   * @returns {Promise<Object|null>}
   */
  async getGuild(guildId) {
    return guildRepository.getByGuildId(guildId);
  }

  /**
   * Get or create guild
   * @param {string} guildId
   * @param {Object} defaults
   * @returns {Promise<Object>}
   */
  async getOrCreateGuild(guildId, defaults = {}) {
    return guildRepository.getOrCreate(guildId, defaults);
  }

  /**
   * Update guild settings
   * @param {string} guildId
   * @param {Object} settings
   * @returns {Promise<Object|null>}
   */
  async updateSettings(guildId, settings) {
    const guild = await guildRepository.updateSettings(guildId, settings);
    if (guild) {
      eventBus.emit(EVENTS.SETTING_UPDATE, { guildId, settings });
    }
    return guild;
  }

  /**
   * Toggle a feature for a guild
   * @param {string} guildId
   * @param {string} feature
   * @param {boolean} enabled
   * @returns {Promise<Object|null>}
   */
  async toggleFeature(guildId, feature, enabled) {
    const guild = await guildRepository.toggleFeature(guildId, feature, enabled);
    if (guild) {
      eventBus.emit(EVENTS.FEATURE_TOGGLE, { guildId, feature, enabled });
    }
    return guild;
  }

  /**
   * Enable a feature
   * @param {string} guildId
   * @param {string} feature
   * @returns {Promise<Object|null>}
   */
  async enableFeature(guildId, feature) {
    return this.toggleFeature(guildId, feature, true);
  }

  /**
   * Disable a feature
   * @param {string} guildId
   * @param {string} feature
   * @returns {Promise<Object|null>}
   */
  async disableFeature(guildId, feature) {
    return this.toggleFeature(guildId, feature, false);
  }

  /**
   * Check if feature is enabled
   * @param {string} guildId
   * @param {string} feature
   * @returns {Promise<boolean>}
   */
  async isFeatureEnabled(guildId, feature) {
    const guild = await this.getGuild(guildId);
    return guild?.features?.[feature] === true;
  }

  /**
   * Get all feature states for a guild
   * @param {string} guildId
   * @returns {Promise<Object>}
   */
  async getFeatureStates(guildId) {
    const guild = await this.getGuild(guildId);
    if (!guild) {
      // Return defaults
      const defaults = {};
      for (const key of getFeatureKeys()) {
        defaults[key] = getFeatureDefault(key);
      }
      return defaults;
    }
    return guild.features || {};
  }

  /**
   * Update nested setting using dot notation
   * @param {string} guildId
   * @param {string} path
   * @param {*} value
   * @returns {Promise<Object|null>}
   */
  async updateNestedSetting(guildId, path, value) {
    const guild = await guildRepository.updateNested(guildId, path, value);
    if (guild) {
      eventBus.emit(EVENTS.SETTING_UPDATE, { guildId, path, value });
    }
    return guild;
  }

  /**
   * Add item to array setting
   * @param {string} guildId
   * @param {string} path
   * @param {*} value
   * @returns {Promise<Object|null>}
   */
  async pushToArraySetting(guildId, path, value) {
    return guildRepository.pushToArray(guildId, path, value);
  }

  /**
   * Remove item from array setting
   * @param {string} guildId
   * @param {string} path
   * @param {*} value
   * @returns {Promise<Object|null>}
   */
  async pullFromArraySetting(guildId, path, value) {
    return guildRepository.pullFromArray(guildId, path, value);
  }

  /**
   * Increment numeric setting
   * @param {string} guildId
   * @param {string} path
   * @param {number} amount
   * @returns {Promise<Object|null>}
   */
  async incrementSetting(guildId, path, amount = 1) {
    return guildRepository.increment(guildId, path, amount);
  }

  /**
   * Get guild metadata (name, icon, memberCount, ownerId)
   * @param {string} guildId
   * @returns {Promise<Object|null>}
   */
  async getMetadata(guildId) {
    const guild = await this.getGuild(guildId);
    if (!guild) return null;

    return {
      id: guild.guildId,
      name: guild.name,
      icon: guild.icon,
      memberCount: guild.memberCount,
      ownerId: guild.ownerId,
      joinedAt: guild.joinedAt,
      leftAt: guild.leftAt,
    };
  }

  /**
   * Update guild metadata
   * @param {string} guildId
   * @param {Object} metadata
   * @returns {Promise<Object|null>}
   */
  async updateMetadata(guildId, metadata) {
    return guildRepository.updateMetadata(guildId, metadata);
  }

  /**
   * Mark guild as left
   * @param {string} guildId
   * @returns {Promise<Object|null>}
   */
  async markLeft(guildId) {
    return guildRepository.markLeft(guildId);
  }

  /**
   * Get guilds with feature enabled
   * @param {string} feature
   * @returns {Promise<Object[]>}
   */
  async getGuildsWithFeature(feature) {
    return guildRepository.getByFeature(feature);
  }

  /**
   * Get guild count
   * @returns {Promise<number>}
   */
  async getGuildCount() {
    return guildRepository.getCount();
  }

  /**
   * Get guilds with pagination
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async getPaginatedGuilds(options = {}) {
    return guildRepository.getPaginated(options);
  }

  /**
   * Reset guild to defaults
   * @param {string} guildId
   * @returns {Promise<Object|null>}
   */
  async resetGuild(guildId) {
    const defaults = {};
    for (const key of getFeatureKeys()) {
      defaults[`features.${key}`] = getFeatureDefault(key);
    }
    // Reset other settings to defaults...
    return guildRepository.updateSettings(guildId, defaults);
  }

  /**
   * Export guild configuration
   * @param {string} guildId
   * @returns {Promise<Object|null>}
   */
  async exportConfig(guildId) {
    const guild = await this.getGuild(guildId);
    if (!guild) return null;

    // Remove internal fields
    const { _id, __v, createdAt, updatedAt, ...config } = guild.toObject();
    return config;
  }

  /**
   * Import guild configuration
   * @param {string} guildId
   * @param {Object} config
   * @returns {Promise<Object|null>}
   */
  async importConfig(guildId, config) {
    return guildRepository.updateSettings(guildId, config);
  }
}

export const guildService = new GuildService();
export default guildService;