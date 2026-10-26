/**
 * Giveaway repository - Giveaway data access
 */
import { BaseRepository } from './BaseRepository.js';
import { Giveaway } from '../models/Giveaway.js';

class GiveawayRepository extends BaseRepository {
  constructor() {
    super(Giveaway);
  }

  /**
   * Get active giveaways (for scheduler)
   * @param {string} guildId
   * @returns {Promise<Document[]>}
   */
  async getActive(guildId = null) {
    const query = { status: 'active', endsAt: { $gt: new Date() } };
    if (guildId) query.guildId = guildId;
    return this.find(query, { sort: { endsAt: 1 } });
  }

  /**
   * Get scheduled giveaways
   * @param {string} guildId
   * @returns {Promise<Document[]>}
   */
  async getScheduled(guildId = null) {
    const query = { status: 'scheduled', startsAt: { $gt: new Date() } };
    if (guildId) query.guildId = guildId;
    return this.find(query, { sort: { startsAt: 1 } });
  }

  /**
   * Get giveaways that should start now
   * @returns {Promise<Document[]>}
   */
  async getStartingNow() {
    return this.find({
      status: 'scheduled',
      startsAt: { $lte: new Date() },
    }, { sort: { startsAt: 1 } });
  }

  /**
   * Get giveaways that should end now
   * @returns {Promise<Document[]>}
   */
  async getEndingNow() {
    return this.find({
      status: 'active',
      endsAt: { $lte: new Date() },
    }, { sort: { endsAt: 1 } });
  }

  /**
   * Get giveaway by message ID
   * @param {string} messageId
   * @returns {Promise<Document|null>}
   */
  async getByMessageId(messageId) {
    return this.findOne({ messageId });
  }

  /**
   * Get guild giveaways with pagination
   * @param {string} guildId
   * @param {Object} options
   * @returns {Promise<{data: Document[], total: number, page: number, pages: number}>}
   */
  async getGuildGiveaways(guildId, options = {}) {
    const { status, page = 1, limit = 20 } = options;
    const query = { guildId };
    if (status) query.status = status;
    return this.paginate(query, { page, limit, sort: { createdAt: -1 } });
  }

  /**
   * Get user's giveaways
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<Document[]>}
   */
  async getUserGiveaways(guildId, userId) {
    return this.find({
      guildId,
      $or: [{ hostId: userId }, { 'winners.userId': userId }],
    }, { sort: { createdAt: -1 } });
  }

  /**
   * Add entry to giveaway
   * @param {string} messageId
   * @param {string} userId
   * @returns {Promise<Document|null>}
   */
  async addEntry(messageId, userId) {
    return this.findOneAndUpdate(
      { messageId },
      {
        $addToSet: { entries: { userId, enteredAt: new Date() } },
        $inc: { entryCount: 1 },
      },
      { new: true }
    );
  }

  /**
   * Remove entry from giveaway
   * @param {string} messageId
   * @param {string} userId
   * @returns {Promise<Document|null>}
   */
  async removeEntry(messageId, userId) {
    return this.findOneAndUpdate(
      { messageId },
      {
        $pull: { entries: { userId } },
        $inc: { entryCount: -1 },
      },
      { new: true }
    );
  }

  /**
   * Start giveaway
   * @param {string} messageId
   * @returns {Promise<Document|null>}
   */
  async start(messageId) {
    return this.findOneAndUpdate(
      { messageId },
      { $set: { status: 'active' } },
      { new: true }
    );
  }

  /**
   * End giveaway with winners
   * @param {string} messageId
   * @param {Array} winners
   * @returns {Promise<Document|null>}
   */
  async end(messageId, winners) {
    const winnerDocs = winners.map((w, i) => ({
      userId: w,
      position: i + 1,
      claimed: false,
    }));

    return this.findOneAndUpdate(
      { messageId },
      {
        $set: {
          status: 'ended',
          endedAt: new Date(),
          winners: winnerDocs,
        },
      },
      { new: true }
    );
  }

  /**
   * Cancel giveaway
   * @param {string} messageId
   * @returns {Promise<Document|null>}
   */
  async cancel(messageId) {
    return this.findOneAndUpdate(
      { messageId },
      { $set: { status: 'cancelled', endedAt: new Date() } },
      { new: true }
    );
  }

  /**
   * Reroll giveaway
   * @param {string} messageId
   * @param {Array} newWinners
   * @returns {Promise<Document|null>}
   */
  async reroll(messageId, newWinners) {
    const winnerDocs = newWinners.map((w, i) => ({
      userId: w,
      position: i + 1,
      claimed: false,
    }));

    return this.findOneAndUpdate(
      { messageId },
      {
        $set: {
          status: 'rerolled',
          endedAt: new Date(),
          winners: winnerDocs,
        },
      },
      { new: true }
    );
  }

  /**
   * Claim prize
   * @param {string} messageId
   * @param {string} userId
   * @returns {Promise<Document|null>}
   */
  async claimPrize(messageId, userId) {
    return this.findOneAndUpdate(
      { messageId, 'winners.userId': userId, 'winners.claimed': false },
      {
        $set: {
          'winners.$.claimed': true,
          'winners.$.claimedAt': new Date(),
        },
      },
      { new: true }
    );
  }

  /**
   * Get giveaway stats
   * @param {string} guildId
   * @returns {Promise<Object>}
   */
  async getStats(guildId) {
    return this.model.aggregate([
      { $match: { guildId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).then(results => {
      const stats = { scheduled: 0, active: 0, ended: 0, cancelled: 0, rerolled: 0, total: 0 };
      for (const r of results) {
        stats[r._id] = r.count;
        stats.total += r.count;
      }
      return stats;
    });
  }

  /**
   * Delete old cancelled giveaways
   * @param {string} guildId
   * @param {number} days
   * @returns {Promise<number>}
   */
  async deleteOldCancelled(guildId, days = 90) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.deleteMany({
      guildId,
      status: 'cancelled',
      createdAt: { $lt: cutoff },
    });
    return result;
  }
}

export const giveawayRepository = new GiveawayRepository();
export default giveawayRepository;