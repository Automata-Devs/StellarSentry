/**
 * Economy Service - Business logic for economy system
 * Handles balance, daily, work, pay, shop, inventory, leaderboards
 */
import { memberRepository } from '../database/repositories/MemberRepository.js';
import { guildRepository } from '../database/repositories/GuildRepository.js';
import { AuditLog } from '../database/models/AuditLog.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { logger } from '../utils/logger.js';
import { randomInt, randomChoice } from '../utils/helpers.js';

class EconomyService {
  /**
   * Get user balance
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getBalance(guildId, userId) {
    const member = await memberRepository.getOrCreate(guildId, userId);
    return {
      wallet: member.economy?.wallet || 0,
      bank: member.economy?.bank || 0,
      total: (member.economy?.wallet || 0) + (member.economy?.bank || 0),
    };
  }

  /**
   * Add money to user
   * @param {string} guildId
   * @param {string} userId
   * @param {number} amount
   * @param {string} type - 'wallet' or 'bank'
   * @returns {Promise<Object>}
   */
  async addMoney(guildId, userId, amount, type = 'wallet') {
    const member = await memberRepository.addBalance(guildId, userId, amount, type);
    await memberRepository.updateNetWorth(guildId, userId);
    return this.getBalance(guildId, userId);
  }

  /**
   * Remove money from user
   * @param {string} guildId
   * @param {string} userId
   * @param {number} amount
   * @param {string} type - 'wallet' or 'bank'
   * @returns {Promise<Object>}
   */
  async removeMoney(guildId, userId, amount, type = 'wallet') {
    const member = await memberRepository.removeBalance(guildId, userId, amount, type);
    await memberRepository.updateNetWorth(guildId, userId);
    return this.getBalance(guildId, userId);
  }

  /**
   * Transfer money between users
   * @param {string} guildId
   * @param {string} fromUserId
   * @param {string} toUserId
   * @param {number} amount
   * @returns {Promise<Object>}
   */
  async transfer(guildId, fromUserId, toUserId, amount) {
    if (fromUserId === toUserId) {
      throw new Error('Cannot transfer to yourself');
    }

    const fromBalance = await this.getBalance(guildId, fromUserId);
    if (fromBalance.wallet < amount) {
      throw new Error('Insufficient funds');
    }

    // Atomic transfer
    await memberRepository.removeBalance(guildId, fromUserId, amount, 'wallet');
    await memberRepository.addBalance(guildId, toUserId, amount, 'wallet');
    await memberRepository.updateNetWorth(guildId, fromUserId);
    await memberRepository.updateNetWorth(guildId, toUserId);

    // Log transaction
    await AuditLog.create({
      guildId,
      userId: fromUserId,
      targetId: toUserId,
      eventType: 'pay',
      eventCategory: 'economy',
      reason: `Transferred ${amount} to <@${toUserId}>`,
      data: { amount, fromUserId, toUserId },
    });

    eventBus.emit(EVENTS.ECONOMY_PAY, { guildId, fromUserId, toUserId, amount });

    return { success: true, amount };
  }

  /**
   * Claim daily reward
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async claimDaily(guildId, userId) {
    const guild = await guildRepository.getByGuildId(guildId);
    const member = await memberRepository.getOrCreate(guildId, userId);

    const now = new Date();
    const lastDaily = member.economy?.lastDaily ? new Date(member.economy.lastDaily) : null;

    // Check cooldown
    if (lastDaily) {
      const diff = now - lastDaily;
      const cooldown = guild?.economy?.dailyCooldown || 86400000; // 24 hours

      if (diff < cooldown) {
        const remaining = cooldown - diff;
        throw new Error(`Daily already claimed. Next claim in ${this.formatTime(remaining)}`);
      }
    }

    // Calculate streak
    let streak = member.economy?.dailyStreak || 0;
    if (lastDaily) {
      const daysDiff = Math.floor((now - lastDaily) / 86400000);
      if (daysDiff === 1) {
        streak += 1;
      } else if (daysDiff > 1) {
        streak = 1;
      }
    } else {
      streak = 1;
    }

    // Calculate reward
    const dailyMin = guild?.economy?.dailyMin || 100;
    const dailyMax = guild?.economy?.dailyMax || 500;
    let amount = randomInt(dailyMin, dailyMax);

    // Streak bonus
    let streakBonus = 0;
    if (streak > 1) {
      streakBonus = Math.min(streak * 50, 1000); // Max 1000 bonus
      amount += streakBonus;
    }

    // Apply
    await memberRepository.addBalance(guildId, userId, amount, 'wallet');
    await memberRepository.getOrCreate(guildId, userId).then(m => {
      m.economy.dailyStreak = streak;
      m.economy.lastDaily = now;
      return m.save();
    });

    // Log
    await AuditLog.create({
      guildId,
      userId,
      eventType: 'dailyClaim',
      eventCategory: 'economy',
      data: { amount, streak, streakBonus },
    });

    eventBus.emit(EVENTS.ECONOMY_DAILY, { guildId, userId, amount, streak });

    return { amount, streak, streakBonus };
  }

  /**
   * Work for money
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async work(guildId, userId) {
    const guild = await guildRepository.getByGuildId(guildId);
    const member = await memberRepository.getOrCreate(guildId, userId);

    const now = new Date();
    const lastWork = member.economy?.lastWork ? new Date(member.economy.lastWork) : null;

    // Check cooldown
    if (lastWork) {
      const diff = now - lastWork;
      const cooldown = guild?.economy?.workCooldown || 1800000; // 30 minutes

      if (diff < cooldown) {
        const remaining = cooldown - diff;
        throw new Error(`You're tired! Try again in ${this.formatTime(remaining)}`);
      }
    }

    // Job options
    const jobs = [
      { name: 'Developer', min: 200, max: 500 },
      { name: 'Designer', min: 150, max: 400 },
      { name: 'Writer', min: 100, max: 300 },
      { name: 'Streamer', min: 50, max: 300 },
      { name: 'Moderator', min: 100, max: 250 },
      { name: 'Tester', min: 80, max: 200 },
      { name: 'Intern', min: 30, max: 100 },
    ];

    const job = randomChoice(jobs);
    const workMin = guild?.economy?.workMin || job.min;
    const workMax = guild?.economy?.workMax || job.max;
    const amount = randomInt(workMin, workMax);

    await memberRepository.addBalance(guildId, userId, amount, 'wallet');
    await memberRepository.getOrCreate(guildId, userId).then(m => {
      m.economy.lastWork = now;
      return m.save();
    });

    await AuditLog.create({
      guildId,
      userId,
      eventType: 'work',
      eventCategory: 'economy',
      data: { amount, job: job.name },
    });

    eventBus.emit(EVENTS.ECONOMY_WORK, { guildId, userId, amount, job: job.name });

    return { amount, job: job.name };
  }

  /**
   * Buy item from shop
   * @param {string} guildId
   * @param {string} userId
   * @param {string} itemId
   * @param {number} quantity
   * @returns {Promise<Object>}
   */
  async buyItem(guildId, userId, itemId, quantity = 1) {
    const guild = await guildRepository.getByGuildId(guildId);
    if (!guild?.economy?.shop) {
      throw new Error('Shop is empty');
    }

    const item = guild.economy.shop.find(i => i.itemId === itemId || i.name === itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    if (item.hidden) {
      throw new Error('Item not available');
    }

    const totalPrice = item.price * quantity;
    const balance = await this.getBalance(guildId, userId);

    if (balance.wallet < totalPrice) {
      throw new Error('Insufficient funds');
    }

    // Check stock
    if (item.stock !== -1 && item.sold + quantity > item.stock) {
      throw new Error('Not enough stock');
    }

    // Check max per user
    const member = await memberRepository.getOrCreate(guildId, userId);
    const userItem = member.inventory?.find(i => i.itemId === item.itemId);
    const currentQty = userItem?.quantity || 0;

    if (currentQty + quantity > item.maxPerUser) {
      throw new Error(`Max ${item.maxPerUser} per user`);
    }

    // Check requirements
    if (item.requirements?.level > 0 && member.leveling?.level < item.requirements.level) {
      throw new Error(`Requires level ${item.requirements.level}`);
    }

    // Apply purchase
    await memberRepository.removeBalance(guildId, userId, totalPrice, 'wallet');
    await memberRepository.addInventoryItem(guildId, userId, {
      itemId: item.itemId,
      name: item.name,
      quantity,
      metadata: { price: item.price },
    });

    // Update shop item sold count
    await guildRepository.updateNestedSetting(guildId, `economy.shop.${guild.economy.shop.indexOf(item)}.sold`, item.sold + quantity);

    // Give role if applicable
    if (item.roleId) {
      try {
        const guildObj = await guildRepository.getGuild(guildId);
        const memberObj = await guildObj.members.fetch(userId);
        await memberObj.roles.add(item.roleId);
      } catch (roleError) {
        logger.warn({ err: roleError }, 'Failed to give role reward');
      }
    }

    await AuditLog.create({
      guildId,
      userId,
      eventType: 'buy',
      eventCategory: 'economy',
      data: { itemId: item.itemId, name: item.name, quantity, totalPrice },
    });

    eventBus.emit(EVENTS.ECONOMY_BUY, { guildId, userId, itemId: item.itemId, quantity, totalPrice });

    return { success: true, item: item.name, quantity, totalPrice };
  }

  /**
   * Get user inventory
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getInventory(guildId, userId) {
    const member = await memberRepository.getOrCreate(guildId, userId);
    return member.inventory || [];
  }

  /**
   * Get economy leaderboard
   * @param {string} guildId
   * @param {number} limit
   * @param {number} page
   * @returns {Promise<Object>}
   */
  async getLeaderboard(guildId, limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    const members = await memberRepository.find(
      { guildId },
      { sort: { 'economy.netWorth': -1 }, limit, skip }
    );

    const total = await memberRepository.count({ guildId });

    return {
      data: members.map((m, i) => ({
        rank: skip + i + 1,
        userId: m.userId,
        wallet: m.economy?.wallet || 0,
        bank: m.economy?.bank || 0,
        netWorth: m.economy?.netWorth || 0,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get shop items
   * @param {string} guildId
   * @returns {Promise<Array>}
   */
  async getShop(guildId) {
    const guild = await guildRepository.getByGuildId(guildId);
    return guild?.economy?.shop || [];
  }

  /**
   * Add shop item
   * @param {string} guildId
   * @param {Object} item
   * @returns {Promise<Object>}
   */
  async addShopItem(guildId, item) {
    const guild = await guildRepository.getOrCreateGuild(guildId);
    const shop = guild.economy?.shop || [];

    // Generate itemId if not provided
    if (!item.itemId) {
      item.itemId = `item_${Date.now()}_${randomInt(1000, 9999)}`;
    }

    // Check for duplicate
    if (shop.some(i => i.itemId === item.itemId)) {
      throw new Error('Item ID already exists');
    }

    // Set defaults
    const newItem = {
      itemId: item.itemId,
      name: item.name,
      description: item.description || '',
      price: item.price,
      roleId: item.roleId || null,
      stock: item.stock ?? -1,
      maxPerUser: item.maxPerUser ?? 1,
      sold: 0,
      requirements: {
        level: item.requirements?.level ?? 0,
        roles: item.requirements?.roles ?? [],
        badge: item.requirements?.badge ?? null,
      },
      emoji: item.emoji || '📦',
      displayOrder: item.displayOrder ?? shop.length,
      hidden: false,
    };

    shop.push(newItem);
    await guildRepository.updateNestedSetting(guildId, 'economy.shop', shop);

    return newItem;
  }

  /**
   * Update shop item
   * @param {string} guildId
   * @param {string} itemId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateShopItem(guildId, itemId, updates) {
    const guild = await guildRepository.getByGuildId(guildId);
    const shop = guild?.economy?.shop || [];
    const index = shop.findIndex(i => i.itemId === itemId);

    if (index === -1) {
      throw new Error('Item not found');
    }

    // Apply updates
    shop[index] = { ...shop[index], ...updates };
    await guildRepository.updateNestedSetting(guildId, 'economy.shop', shop);

    return shop[index];
  }

  /**
   * Remove shop item
   * @param {string} guildId
   * @param {string} itemId
   * @returns {Promise<boolean>}
   */
  async removeShopItem(guildId, itemId) {
    const guild = await guildRepository.getByGuildId(guildId);
    const shop = guild?.economy?.shop || [];
    const filtered = shop.filter(i => i.itemId !== itemId);

    if (filtered.length === shop.length) {
      throw new Error('Item not found');
    }

    await guildRepository.updateNestedSetting(guildId, 'economy.shop', filtered);
    return true;
  }

  /**
   * Format time helper
   */
  formatTime(ms) {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${remMinutes}m`;
  }
}

export const economyService = new EconomyService();
export default economyService;