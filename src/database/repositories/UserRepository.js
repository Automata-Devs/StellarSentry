/**
 * User repository - Global user data access
 */
import { BaseRepository } from './BaseRepository.js';
import { User } from '../models/User.js';

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Get user by Discord ID
   * @param {string} userId
   * @returns {Promise<Document|null>}
   */
  async getByUserId(userId) {
    return this.findOne({ userId });
  }

  /**
   * Get or create user
   * @param {string} userId
   * @param {Object} defaults
   * @returns {Promise<Document>}
   */
  async getOrCreate(userId, defaults = {}) {
    let user = await this.getByUserId(userId);
    if (!user) {
      user = await this.create({ userId, ...defaults });
    }
    return user;
  }

  /**
   * Update user balance
   * @param {string} userId
   * @param {number} amount
   * @param {string} type - 'wallet' or 'bank'
   * @returns {Promise<Document|null>}
   */
  async updateBalance(userId, amount, type = 'wallet') {
    return this.findOneAndUpdate(
      { userId },
      { $inc: { [`globalBalance.${type}`]: amount } },
      { new: true }
    );
  }

  /**
   * Increment user stat
   * @param {string} userId
   * @param {string} stat
   * @param {number} amount
   * @returns {Promise<Document|null>}
   */
  async incrementStat(userId, stat, amount = 1) {
    return this.findOneAndUpdate(
      { userId },
      { $inc: { [`stats.${stat}`]: amount } },
      { new: true }
    );
  }

  /**
   * Add badge to user
   * @param {string} userId
   * @param {Object} badge
   * @returns {Promise<Document|null>}
   */
  async addBadge(userId, badge) {
    return this.findOneAndUpdate(
      { userId },
      { $addToSet: { badges: { ...badge, earnedAt: new Date() } } },
      { new: true }
    );
  }

  /**
   * Update user preferences
   * @param {string} userId
   * @param {Object} preferences
   * @returns {Promise<Document|null>}
   */
  async updatePreferences(userId, preferences) {
    return this.findOneAndUpdate(
      { userId },
      { $set: { preferences } },
      { new: true }
    );
  }

  /**
   * Update last active timestamp
   * @param {string} userId
   * @returns {Promise<Document|null>}
   */
  async updateLastActive(userId) {
    return this.findOneAndUpdate(
      { userId },
      { $set: { lastActiveAt: new Date() } },
      { new: true }
    );
  }

  /**
   * Blacklist user
   * @param {string} userId
   * @param {string} reason
   * @param {string} moderatorId
   * @returns {Promise<Document|null>}
   */
  async blacklist(userId, reason, moderatorId) {
    return this.findOneAndUpdate(
      { userId },
      {
        $set: {
          blacklisted: true,
          blacklistReason: reason,
          blacklistedAt: new Date(),
          blacklistedBy: moderatorId,
        },
      },
      { new: true }
    );
  }

  /**
   * Remove blacklist
   * @param {string} userId
   * @returns {Promise<Document|null>}
   */
  async removeBlacklist(userId) {
    return this.findOneAndUpdate(
      { userId },
      {
        $set: {
          blacklisted: false,
          blacklistReason: null,
          blacklistedAt: null,
          blacklistedBy: null,
        },
      },
      { new: true }
    );
  }

  /**
   * Get leaderboard by wallet balance
   * @param {number} limit
   * @returns {Promise<Document[]>}
   */
  async getWalletLeaderboard(limit = 10) {
    return this.find(
      { blacklisted: false },
      { sort: { 'globalBalance.wallet': -1 }, limit }
    );
  }

  /**
   * Get leaderboard by total balance
   * @param {number} limit
   * @returns {Promise<Document[]>}
   */
  async getTotalBalanceLeaderboard(limit = 10) {
    return this.aggregate([
      { $match: { blacklisted: false } },
      { $addFields: { totalBalance: { $add: ['$globalBalance.wallet', '$globalBalance.bank'] } } },
      { $sort: { totalBalance: -1 } },
      { $limit: limit },
      { $project: { userId: 1, globalBalance: 1, totalBalance: 1, stats: 1 } },
    ]);
  }

  /**
   * Get leaderboard by commands used
   * @param {number} limit
   * @returns {Promise<Document[]>}
   */
  async getCommandsLeaderboard(limit = 10) {
    return this.find(
      { blacklisted: false },
      { sort: { 'stats.commandsUsed': -1 }, limit }
    );
  }

  /**
   * Search users by name/ID (requires Discord API for names)
   * @param {string} query
   * @param {number} limit
   * @returns {Promise<Document[]>}
   */
  async search(query, limit = 10) {
    const isId = /^\d{17,19}$/.test(query);
    if (isId) {
      const user = await this.getByUserId(query);
      return user ? [user] : [];
    }
    // For name search, we'd need to store username in DB or use Discord API
    return [];
  }
}

export const userRepository = new UserRepository();
export default userRepository;