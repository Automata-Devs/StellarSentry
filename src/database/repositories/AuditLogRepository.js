/**
 * AuditLog repository - Audit log data access
 */
import { BaseRepository } from './BaseRepository.js';
import { AuditLog } from '../models/AuditLog.js';

class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }

  /**
   * Log an event
   * @param {Object} data
   * @returns {Promise<Document>}
   */
  async log(data) {
    return this.create(data);
  }

  /**
   * Get logs with filters and pagination
   * @param {string} guildId
   * @param {Object} options
   * @returns {Promise<{data: Document[], total: number, page: number, pages: number}>}
   */
  async getLogs(guildId, options = {}) {
    const {
      eventType,
      eventCategory,
      userId,
      moderatorId,
      channelId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = options;

    const query = { guildId };

    if (eventType) query.eventType = eventType;
    if (eventCategory) query.eventCategory = eventCategory;
    if (userId) query.userId = userId;
    if (moderatorId) query.moderatorId = moderatorId;
    if (channelId) query.channelId = channelId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    return this.paginate(query, { page, limit, sort: { createdAt: -1 } });
  }

  /**
   * Get recent logs for guild
   * @param {string} guildId
   * @param {number} limit
   * @returns {Promise<Document[]>}
   */
  async getRecent(guildId, limit = 50) {
    return this.find({ guildId }, { limit, sort: { createdAt: -1 } });
  }

  /**
   * Get logs by category
   * @param {string} guildId
   * @param {string} category
   * @param {number} limit
   * @returns {Promise<Document[]>}
   */
  async getByCategory(guildId, category, limit = 50) {
    return this.find({ guildId, eventCategory: category }, { limit, sort: { createdAt: -1 } });
  }

  /**
   * Get moderation logs for user
   * @param {string} guildId
   * @param {string} userId
   * @param {number} limit
   * @returns {Promise<Document[]>}
   */
  async getModerationLogs(guildId, userId, limit = 20) {
    return this.find(
      { guildId, eventCategory: 'moderation', userId },
      { limit, sort: { createdAt: -1 } }
    );
  }

  /**
   * Get logs by moderator
   * @param {string} guildId
   * @param {string} moderatorId
   * @param {number} limit
   * @returns {Promise<Document[]>}
   */
  async getByModerator(guildId, moderatorId, limit = 50) {
    return this.find(
      { guildId, moderatorId, eventCategory: 'moderation' },
      { limit, sort: { createdAt: -1 } }
    );
  }

  /**
   * Get event stats for guild (last N days)
   * @param {string} guildId
   * @param {number} days
   * @returns {Promise<Array>}
   */
  async getEventStats(guildId, days = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return this.aggregate([
      { $match: { guildId, createdAt: { $gte: startDate } } },
      { $group: { _id: '$eventCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  /**
   * Get moderation stats for guild
   * @param {string} guildId
   * @param {number} days
   * @returns {Promise<Array>}
   */
  async getModerationStats(guildId, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return this.aggregate([
      { $match: { guildId, eventCategory: 'moderation', createdAt: { $gte: startDate } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  /**
   * Get top moderators
   * @param {string} guildId
   * @param {number} days
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getTopModerators(guildId, days = 30, limit = 10) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return this.aggregate([
      { $match: { guildId, eventCategory: 'moderation', moderatorId: { $ne: null }, createdAt: { $gte: startDate } } },
      { $group: { _id: '$moderatorId', count: { $sum: 1 }, actions: { $push: '$eventType' } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }

  /**
   * Get user activity timeline
   * @param {string} guildId
   * @param {string} userId
   * @param {number} days
   * @returns {Promise<Array>}
   */
  async getUserTimeline(guildId, userId, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return this.find(
      { guildId, userId, createdAt: { $gte: startDate } },
      { limit: 100, sort: { createdAt: -1 } }
    );
  }

  /**
   * Cleanup old logs
   * @param {string} guildId
   * @param {number} days
   * @returns {Promise<number>}
   */
  async cleanupOld(guildId, days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.deleteMany({ guildId, createdAt: { $lt: cutoff } });
    return result;
  }

  /**
   * Get distinct event types for guild
   * @param {string} guildId
   * @returns {Promise<string[]>}
   */
  async getEventTypes(guildId) {
    return this.distinct('eventType', { guildId });
  }

  /**
   * Get distinct event categories for guild
   * @param {string} guildId
   * @returns {Promise<string[]>}
   */
  async getEventCategories(guildId) {
    return this.distinct('eventCategory', { guildId });
  }
}

export const auditLogRepository = new AuditLogRepository();
export default auditLogRepository;