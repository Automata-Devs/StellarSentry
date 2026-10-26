/**
 * Member repository - Per-guild member data access
 */
import { BaseRepository } from './BaseRepository.js';
import { Member } from '../models/Member.js';

class MemberRepository extends BaseRepository {
  constructor() {
    super(Member);
  }

  /**
   * Get member by guild and user ID
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<Document|null>}
   */
  async getByIds(guildId, userId) {
    return this.findOne({ guildId, userId });
  }

  /**
   * Get or create member
   * @param {string} guildId
   * @param {string} userId
   * @param {Object} defaults
   * @returns {Promise<Document>}
   */
  async getOrCreate(guildId, userId, defaults = {}) {
    let member = await this.getByIds(guildId, userId);
    if (!member) {
      member = await this.create({ guildId, userId, ...defaults });
    }
    return member;
  }

  /**
   * Add XP to member
   * @param {string} guildId
   * @param {string} userId
   * @param {number} amount
   * @returns {Promise<Document|null>}
   */
  async addXp(guildId, userId, amount) {
    return this.findOneAndUpdate(
      { guildId, userId },
      {
        $inc: {
          'leveling.xp': amount,
          'leveling.totalXp': amount,
          'leveling.messagesCount': 1,
        },
        $set: { 'leveling.lastXpGain': new Date() },
      },
      { new: true }
    );
  }

  /**
   * Set member level and XP
   * @param {string} guildId
   * @param {string} userId
   * @param {number} level
   * @param {number} xp
   * @returns {Promise<Document|null>}
   */
  async setLevel(guildId, userId, level, xp = 0) {
    return this.findOneAndUpdate(
      { guildId, userId },
      {
        $set: {
          'leveling.level': level,
          'leveling.xp': xp,
        },
      },
      { new: true }
    );
  }

  /**
   * Add balance to member
   * @param {string} guildId
   * @param {string} userId
   * @param {number} amount
   * @param {string} type - 'wallet' or 'bank'
   * @returns {Promise<Document|null>}
   */
  async addBalance(guildId, userId, amount, type = 'wallet') {
    return this.findOneAndUpdate(
      { guildId, userId },
      { $inc: { [`economy.${type}`]: amount, 'economy.totalEarned': amount } },
      { new: true }
    );
  }

  /**
   * Remove balance from member
   * @param {string} guildId
   * @param {string} userId
   * @param {number} amount
   * @param {string} type - 'wallet' or 'bank'
   * @returns {Promise<Document|null>}
   */
  async removeBalance(guildId, userId, amount, type = 'wallet') {
    return this.findOneAndUpdate(
      { guildId, userId },
      {
        $inc: { [`economy.${type}`]: -amount, 'economy.totalSpent': amount },
        $set: { 'economy.netWorth': 0 }, // Will be recalculated
      },
      { new: true }
    );
  }

  /**
   * Update member's net worth
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<Document|null>}
   */
  async updateNetWorth(guildId, userId) {
    return this.findOneAndUpdate(
      { guildId, userId },
      [{ $set: { 'economy.netWorth': { $add: ['$economy.wallet', '$economy.bank'] } } }],
      { new: true }
    );
  }

  /**
   * Add item to inventory
   * @param {string} guildId
   * @param {string} userId
   * @param {Object} item
   * @returns {Promise<Document|null>}
   */
  async addInventoryItem(guildId, userId, item) {
    // Use arrayFilters to update existing or add new
    return this.model.findOneAndUpdate(
      { guildId, userId },
      {
        $set: { 'inventory.$[elem].quantity': { $add: ['$inventory.$[elem].quantity', item.quantity] } },
        $push: {
          inventory: {
            $each: [],
            $position: 0,
          },
        },
      },
      {
        arrayFilters: [{ 'elem.itemId': item.itemId }],
        new: true,
      }
    ).then(doc => {
      if (!doc || !doc.inventory.some(i => i.itemId === item.itemId)) {
        // Item didn't exist, add it
        return this.findOneAndUpdate(
          { guildId, userId },
          { $push: { inventory: { ...item, acquiredAt: new Date() } } },
          { new: true }
        );
      }
      return doc;
    });
  }

  /**
   * Remove item from inventory
   * @param {string} guildId
   * @param {string} userId
   * @param {string} itemId
   * @param {number} quantity
   * @returns {Promise<Document|null>}
   */
  async removeInventoryItem(guildId, userId, itemId, quantity = 1) {
    // This is complex with arrayFilters, simplified approach:
    const member = await this.getByIds(guildId, userId);
    if (!member) return null;

    const itemIndex = member.inventory.findIndex(i => i.itemId === itemId);
    if (itemIndex === -1) return null;

    const item = member.inventory[itemIndex];
    if (item.quantity <= quantity) {
      member.inventory.splice(itemIndex, 1);
    } else {
      item.quantity -= quantity;
    }

    return member.save();
  }

  /**
   * Add warning
   * @param {string} guildId
   * @param {string} userId
   * @param {Object} warning
   * @returns {Promise<Document|null>}
   */
  async addWarning(guildId, userId, warning) {
    return this.findOneAndUpdate(
      { guildId, userId },
      { $push: { warnings: { ...warning, createdAt: new Date() } } },
      { new: true }
    );
  }

  /**
   * Remove warning
   * @param {string} guildId
   * @param {string} userId
   * @param {number} caseNumber
   * @returns {Promise<Document|null>}
   */
  async removeWarning(guildId, userId, caseNumber) {
    return this.findOneAndUpdate(
      { guildId, userId },
      { $set: { 'warnings.$[elem].active': false } },
      {
        arrayFilters: [{ 'elem.caseNumber': caseNumber }],
        new: true,
      }
    );
  }

  /**
   * Add timeout
   * @param {string} guildId
   * @param {string} userId
   * @param {Object} timeout
   * @returns {Promise<Document|null>}
   */
  async addTimeout(guildId, userId, timeout) {
    return this.findOneAndUpdate(
      { guildId, userId },
      { $push: { timeouts: { ...timeout, startsAt: new Date() } } },
      { new: true }
    );
  }

  /**
   * Remove timeout
   * @param {string} guildId
   * @param {string} userId
   * @param {number} caseNumber
   * @returns {Promise<Document|null>}
   */
  async removeTimeout(guildId, userId, caseNumber) {
    return this.findOneAndUpdate(
      { guildId, userId },
      { $set: { 'timeouts.$[elem].active': false } },
      {
        arrayFilters: [{ 'elem.caseNumber': caseNumber }],
        new: true,
      }
    );
  }

  /**
   * Add voice time
   * @param {string} guildId
   * @param {string} userId
   * @param {number} duration
   * @returns {Promise<Document|null>}
   */
  async addVoiceTime(guildId, userId, duration) {
    return this.findOneAndUpdate(
      { guildId, userId },
      {
        $inc: { 'voice.totalTime': duration },
        $push: {
          'voice.sessions': {
            $each: [{ duration, joinedAt: new Date(Date.now() - duration), leftAt: new Date() }],
            $slice: -100,
          },
        },
        $set: { 'voice.lastChannelId': null, 'voice.lastJoinedAt': null },
      },
      { new: true }
    );
  }

  /**
   * Update voice channel
   * @param {string} guildId
   * @param {string} userId
   * @param {string} channelId
   * @param {boolean} joined
   * @returns {Promise<Document|null>}
   */
  async updateVoiceChannel(guildId, userId, channelId, joined) {
    if (joined) {
      return this.findOneAndUpdate(
        { guildId, userId },
        { $set: { 'voice.lastChannelId': channelId, 'voice.lastJoinedAt': new Date() } },
        { new: true }
      );
    } else {
      return this.findOneAndUpdate(
        { guildId, userId },
        { $set: { 'voice.lastChannelId': null, 'voice.lastJoinedAt': null } },
        { new: true }
      );
    }
  }

  /**
   * Record activity
   * @param {string} guildId
   * @param {string} userId
   * @param {string} type - 'message' or 'command'
   * @returns {Promise<Document|null>}
   */
  async recordActivity(guildId, userId, type) {
    const updates = type === 'message'
      ? {
        $inc: {
          'activity.messagesToday': 1,
          'activity.messagesThisWeek': 1,
          'activity.messagesThisMonth': 1,
        },
        $set: { 'activity.lastMessageAt': new Date() },
      }
      : {
        $inc: { 'activity.commandsUsed': 1 },
        $set: { 'activity.lastCommandAt': new Date() },
      };

    return this.findOneAndUpdate({ guildId, userId }, updates, { new: true });
  }

  /**
   * Add reputation
   * @param {string} guildId
   * @param {string} userId
   * @param {string} type - 'positive' or 'negative'
   * @returns {Promise<Document|null>}
   */
  async addReputation(guildId, userId, type) {
    return this.findOneAndUpdate(
      { guildId, userId },
      { $inc: { [`reputation.${type}`]: 1 } },
      { new: true }
    );
  }

  /**
   * Add mod note
   * @param {string} guildId
   * @param {string} userId
   * @param {string} moderatorId
   * @param {string} content
   * @returns {Promise<Document|null>}
   */
  async addNote(guildId, userId, moderatorId, content) {
    return this.findOneAndUpdate(
      { guildId, userId },
      {
        $push: {
          notes: {
            $each: [{ moderatorId, content, createdAt: new Date() }],
            $slice: -50,
          },
        },
      },
      { new: true }
    );
  }

  /**
   * Get leaderboard by XP
   * @param {string} guildId
   * @param {number} limit
   * @param {number} skip
   * @returns {Promise<Document[]>}
   */
  async getXpLeaderboard(guildId, limit = 10, skip = 0) {
    return this.find(
      { guildId },
      { sort: { 'leveling.xp': -1 }, limit, skip }
    );
  }

  /**
   * Get leaderboard by level
   * @param {string} guildId
   * @param {number} limit
   * @param {number} skip
   * @returns {Promise<Document[]>}
   */
  async getLevelLeaderboard(guildId, limit = 10, skip = 0) {
    return this.find(
      { guildId },
      { sort: { 'leveling.level': -1, 'leveling.xp': -1 }, limit, skip }
    );
  }

  /**
   * Get economy leaderboard
   * @param {string} guildId
   * @param {number} limit
   * @param {number} skip
   * @returns {Promise<Document[]>}
   */
  async getEconomyLeaderboard(guildId, limit = 10, skip = 0) {
    return this.find(
      { guildId },
      { sort: { 'economy.netWorth': -1 }, limit, skip }
    );
  }

  /**
   * Get member rank in leaderboard
   * @param {string} guildId
   * @param {string} userId
   * @param {string} type - 'xp', 'level', 'economy'
   * @returns {Promise<number>}
   */
  async getRank(guildId, userId, type = 'xp') {
    const sortField = type === 'xp' ? 'leveling.xp' : type === 'level' ? 'leveling.level' : 'economy.netWorth';
    const count = await this.count({
      guildId,
      [sortField]: { $gt: (await this.getByIds(guildId, userId))?.[sortField.split('.').reduce((o, k) => o?.[k], 0)] || 0 },
    });
    return count + 1;
  }

  /**
   * Get active timeouts
   * @param {string} guildId
   * @returns {Promise<Document[]>}
   */
  async getActiveTimeouts(guildId) {
    return this.find({
      guildId,
      'timeouts.active': true,
      'timeouts.endsAt': { $gt: new Date() },
    });
  }

  /**
   * Get active warnings
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<Document[]>}
   */
  async getActiveWarnings(guildId, userId) {
    const member = await this.getByIds(guildId, userId);
    if (!member) return [];
    return member.warnings.filter(w =>
      w.active && (!w.expiresAt || w.expiresAt > new Date())
    );
  }

  /**
   * Reset daily/weekly/monthly message counts (run via cron)
   * @param {string} guildId
   * @returns {Promise<void>}
   */
  async resetMessageCounts(guildId) {
    await this.updateMany(
      { guildId },
      { $set: { 'activity.messagesToday': 0 } }
    );
  }

  async resetWeeklyMessageCounts(guildId) {
    await this.updateMany(
      { guildId },
      { $set: { 'activity.messagesThisWeek': 0 } }
    );
  }

  async resetMonthlyMessageCounts(guildId) {
    await this.updateMany(
      { guildId },
      { $set: { 'activity.messagesThisMonth': 0 } }
    );
  }
}

export const memberRepository = new MemberRepository();
export default memberRepository;