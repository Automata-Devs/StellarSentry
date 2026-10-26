/**
 * Guild repository - Guild-specific data access
 */
import { BaseRepository } from './BaseRepository.js';
import { Guild } from '../models/Guild.js';

class GuildRepository extends BaseRepository {
  constructor() {
    super(Guild);
  }

  /**
   * Get guild by Discord ID
   * @param {string} guildId
   * @returns {Promise<Document|null>}
   */
  async getByGuildId(guildId) {
    return this.findOne({ guildId });
  }

  /**
   * Get or create guild
   * @param {string} guildId
   * @param {Object} defaults
   * @returns {Promise<Document>}
   */
  async getOrCreate(guildId, defaults = {}) {
    let guild = await this.getByGuildId(guildId);
    if (!guild) {
      guild = await this.create({ guildId, ...defaults });
    }
    return guild;
  }

  /**
   * Update guild settings
   * @param {string} guildId
   * @param {Object} settings
   * @returns {Promise<Document|null>}
   */
  async updateSettings(guildId, settings) {
    return this.findOneAndUpdate(
      { guildId },
      { $set: settings },
      { new: true }
    );
  }

  /**
   * Toggle a feature
   * @param {string} guildId
   * @param {string} feature
   * @param {boolean} enabled
   * @returns {Promise<Document|null>}
   */
  async toggleFeature(guildId, feature, enabled) {
    return this.findOneAndUpdate(
      { guildId },
      { $set: { [`features.${feature}`]: enabled } },
      { new: true }
    );
  }

  /**
   * Update nested setting using dot notation
   * @param {string} guildId
   * @param {string} path
   * @param {*} value
   * @returns {Promise<Document|null>}
   */
  async updateNested(guildId, path, value) {
    return this.findOneAndUpdate(
      { guildId },
      { $set: { [path]: value } },
      { new: true }
    );
  }

  /**
   * Push to array field
   * @param {string} guildId
   * @param {string} path
   * @param {*} value
   * @returns {Promise<Document|null>}
   */
  async pushToArray(guildId, path, value) {
    return this.findOneAndUpdate(
      { guildId },
      { $push: { [path]: value } },
      { new: true }
    );
  }

  /**
   * Pull from array field
   * @param {string} guildId
   * @param {string} path
   * @param {*} value
   * @returns {Promise<Document|null>}
   */
  async pullFromArray(guildId, path, value) {
    return this.findOneAndUpdate(
      { guildId },
      { $pull: { [path]: value } },
      { new: true }
    );
  }

  /**
   * Increment a numeric field
   * @param {string} guildId
   * @param {string} path
   * @param {number} amount
   * @returns {Promise<Document|null>}
   */
  async increment(guildId, path, amount = 1) {
    return this.findOneAndUpdate(
      { guildId },
      { $inc: { [path]: amount } },
      { new: true }
    );
  }

  /**
   * Get guilds with feature enabled
   * @param {string} feature
   * @returns {Promise<Document[]>}
   */
  async getByFeature(feature) {
    return this.find({ [`features.${feature}`]: true });
  }

  /**
   * Get guild count
   * @returns {Promise<number>}
   */
  async getCount() {
    return this.count({});
  }

  /**
   * Get guilds with pagination
   * @param {Object} options
   * @returns {Promise<{data: Document[], total: number, page: number, pages: number}>}
   */
  async getPaginated(options = {}) {
    return this.paginate({}, options);
  }

  /**
   * Update guild metadata (name, icon, memberCount, ownerId)
   * @param {string} guildId
   * @param {Object} metadata
   * @returns {Promise<Document|null>}
   */
  async updateMetadata(guildId, metadata) {
    return this.findOneAndUpdate(
      { guildId },
      { $set: metadata },
      { new: true }
    );
  }

  /**
   * Mark guild as left
   * @param {string} guildId
   * @returns {Promise<Document|null>}
   */
  async markLeft(guildId) {
    return this.findOneAndUpdate(
      { guildId },
      { $set: { leftAt: new Date() } },
      { new: true }
    );
  }
}

export const guildRepository = new GuildRepository();
export default guildRepository;