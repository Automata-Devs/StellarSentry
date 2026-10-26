/**
 * Leveling Service - Business logic for leveling system
 * Handles XP gain, level ups, role rewards, rank cards
 */
import { memberRepository } from '../database/repositories/MemberRepository.js';
import { guildRepository } from '../database/repositories/GuildRepository.js';
import { AuditLog } from '../database/models/AuditLog.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { logger } from '../utils/logger.js';
import { multiCache } from '../utils/cache.js';

class LevelingService {
  /**
   * Get user level data
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getLevel(guildId, userId) {
    const member = await memberRepository.getOrCreate(guildId, userId);
    const level = member.leveling?.level || 0;
    const xp = member.leveling?.xp || 0;
    const xpForNext = this.getXpForLevel(level + 1);

    return {
      level,
      xp,
      xpForNext,
      progress: xpForNext > 0 ? (xp / xpForNext) * 100 : 0,
      totalXp: member.leveling?.totalXp || 0,
      rank: await this.getRank(guildId, userId),
    };
  }

  /**
   * Calculate XP required for a level
   * @param {number} level
   * @returns {number}
   */
  getXpForLevel(level) {
    // Formula: 100 * level^1.5
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Get XP for next level
   * @param {number} currentLevel
   * @returns {number}
   */
  getXpForNextLevel(currentLevel) {
    return this.getXpForLevel(currentLevel + 1);
  }

  /**
   * Add XP to user
   * @param {string} guildId
   * @param {string} userId
   * @param {number} amount
   * @returns {Promise<Object>} { leveledUp, newLevel, oldLevel }
   */
  async addXp(guildId, userId, amount) {
    const guild = await guildRepository.getByGuildId(guildId);
    if (!guild?.leveling?.enabled) return { leveledUp: false };

    // Check cooldown
    const member = await memberRepository.getOrCreate(guildId, userId);
    const lastXpGain = member.leveling?.lastXpGain ? new Date(member.leveling.lastXpGain) : null;
    const cooldown = guild.leveling?.xpCooldown || 60; // seconds

    if (lastXpGain && (Date.now() - lastXpGain.getTime()) < cooldown * 1000) {
      return { leveledUp: false, reason: 'cooldown' };
    }

    // Check ignored channels/roles
    // This would be done in the event handler

    const oldLevel = member.leveling?.level || 0;
    const result = await memberRepository.addXp(guildId, userId, amount);
    const newLevel = result.leveling?.level || 0;

    // Check for level up
    if (newLevel > oldLevel) {
      await this.handleLevelUp(guildId, userId, oldLevel, newLevel, guild);
      return { leveledUp: true, oldLevel, newLevel };
    }

    return { leveledUp: false, oldLevel, newLevel };
  }

  /**
   * Handle level up
   * @param {string} guildId
   * @param {string} userId
   * @param {number} oldLevel
   * @param {number} newLevel
   * @param {Object} guild
   */
  async handleLevelUp(guildId, userId, oldLevel, newLevel, guild) {
    // Check role rewards
    const roleRewards = guild.leveling?.roleRewards || [];
    for (const reward of roleRewards) {
      if (reward.level === newLevel) {
        try {
          const guildObj = await guildRepository.getGuild(guildId);
          const member = await guildObj.members.fetch(userId);
          await member.roles.add(reward.role);
          logger.info({ guildId, userId, roleId: reward.role, level: newLevel }, 'Level up role reward given');
        } catch (error) {
          logger.warn({ err: error, guildId, userId, roleId: reward.role }, 'Failed to give level up role');
        }
      }
    }

    // Send level up message
    const levelUpChannel = guild.leveling?.levelUpChannel;
    if (levelUpChannel) {
      try {
        const channel = await guildRepository.getChannel(levelUpChannel);
        if (channel) {
          const message = guild.leveling?.levelUpMessage
            ? guild.leveling.levelUpMessage
              .replace('{user}', `<@${userId}>`)
              .replace('{level}', newLevel.toString())
              .replace('{oldLevel}', oldLevel.toString())
            : `Congratulations <@${userId}>! You reached level **${newLevel}**!`;

          await channel.send(message);
        }
      } catch (error) {
        logger.debug({ err: error }, 'Failed to send level up message');
      }
    }

    // Log
    await AuditLog.create({
      guildId,
      userId,
      eventType: 'levelUp',
      eventCategory: 'leveling',
      data: { oldLevel, newLevel },
    });

    eventBus.emit(EVENTS.LEVEL_UP, { guildId, userId, oldLevel, newLevel });

    // Check for role rewards
    const roleReward = roleRewards.find(r => r.level === newLevel);
    if (roleReward) {
      eventBus.emit(EVENTS.ROLE_REWARD, { guildId, userId, roleId: roleReward.role, level: newLevel });
    }
  }

  /**
   * Set user XP
   * @param {string} guildId
   * @param {string} userId
   * @param {number} xp
   * @returns {Promise<Object>}
   */
  async setXp(guildId, userId, xp) {
    await memberRepository.setLevel(guildId, userId, 0, xp);
    return this.getLevel(guildId, userId);
  }

  /**
   * Set user level
   * @param {string} guildId
   * @param {string} userId
   * @param {number} level
   * @returns {Promise<Object>}
   */
  async setLevel(guildId, userId, level) {
    const xpForLevel = this.getXpForLevel(level);
    await memberRepository.setLevel(guildId, userId, level, 0);
    return this.getLevel(guildId, userId);
  }

  /**
   * Get user rank
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async getRank(guildId, userId) {
    const member = await memberRepository.getOrCreate(guildId, userId);
    const userXp = member.leveling?.totalXp || 0;

    const count = await memberRepository.count({
      guildId,
      'leveling.totalXp': { $gt: userXp },
    });

    return count + 1;
  }

  /**
   * Get leaderboard
   * @param {string} guildId
   * @param {number} limit
   * @param {number} page
   * @returns {Promise<Object>}
   */
  async getLeaderboard(guildId, limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    const members = await memberRepository.find(
      { guildId },
      { sort: { 'leveling.level': -1, 'leveling.xp': -1 }, limit, skip }
    );

    const total = await memberRepository.count({ guildId });

    return {
      data: members.map((m, i) => ({
        rank: skip + i + 1,
        userId: m.userId,
        level: m.leveling?.level || 0,
        xp: m.leveling?.xp || 0,
        totalXp: m.leveling?.totalXp || 0,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get leveling config for guild
   * @param {string} guildId
   * @returns {Promise<Object>}
   */
  async getConfig(guildId) {
    const guild = await guildRepository.getByGuildId(guildId);
    return guild?.leveling || {};
  }

  /**
   * Update leveling config
   * @param {string} guildId
   * @param {Object} config
   * @returns {Promise<Object>}
   */
  async updateConfig(guildId, config) {
    return guildRepository.updateSettings(guildId, { leveling: config });
  }

  /**
   * Add role reward
   * @param {string} guildId
   * @param {number} level
   * @param {string} roleId
   * @returns {Promise<Object>}
   */
  async addRoleReward(guildId, level, roleId) {
    const guild = await guildRepository.getByGuildId(guildId);
    const rewards = guild.leveling?.roleRewards || [];

    // Check if already exists for this level
    const existing = rewards.find(r => r.level === level);
    if (existing) {
      existing.role = roleId;
    } else {
      rewards.push({ level, role: roleId });
    }

    // Sort by level
    rewards.sort((a, b) => a.level - b.level);

    await guildRepository.updateNestedSetting(guildId, 'leveling.roleRewards', rewards);
    return { level, roleId };
  }

  /**
   * Remove role reward
   * @param {string} guildId
   * @param {number} level
   * @returns {Promise<boolean>}
   */
  async removeRoleReward(guildId, level) {
    const guild = await guildRepository.getByGuildId(guildId);
    const rewards = (guild.leveling?.roleRewards || []).filter(r => r.level !== level);

    await guildRepository.updateNestedSetting(guildId, 'leveling.roleRewards', rewards);
    return true;
  }

  /**
   * Add ignored channel
   * @param {string} guildId
   * @param {string} channelId
   * @returns {Promise<Object>}
   */
  async addIgnoredChannel(guildId, channelId) {
    return guildRepository.pushToArraySetting(guildId, 'leveling.ignoredChannels', channelId);
  }

  /**
   * Remove ignored channel
   * @param {string} guildId
   * @param {string} channelId
   * @returns {Promise<Object>}
   */
  async removeIgnoredChannel(guildId, channelId) {
    return guildRepository.pullFromArraySetting(guildId, 'leveling.ignoredChannels', channelId);
  }

  /**
   * Add ignored role
   * @param {string} guildId
   * @param {string} roleId
   * @returns {Promise<Object>}
   */
  async addIgnoredRole(guildId, roleId) {
    return guildRepository.pushToArraySetting(guildId, 'leveling.ignoredRoles', roleId);
  }

  /**
   * Remove ignored role
   * @param {string} guildId
   * @param {string} roleId
   * @returns {Promise<Object>}
   */
  async removeIgnoredRole(guildId, roleId) {
    return guildRepository.pullFromArraySetting(guildId, 'leveling.ignoredRoles', roleId);
  }

  /**
   * Check if channel is ignored
   * @param {string} guildId
   * @param {string} channelId
   * @returns {Promise<boolean>}
   */
  async isChannelIgnored(guildId, channelId) {
    const guild = await guildRepository.getByGuildId(guildId);
    return guild?.leveling?.ignoredChannels?.includes(channelId) || false;
  }

  /**
   * Check if role is ignored
   * @param {string} guildId
   * @param {string} roleId
   * @returns {Promise<boolean>}
   */
  async isRoleIgnored(guildId, roleId) {
    const guild = await guildRepository.getByGuildId(guildId);
    return guild?.leveling?.ignoredRoles?.includes(roleId) || false;
  }

  /**
   * Generate rank card (placeholder - would use @napi-rs/canvas)
   * @param {Object} data
   * @returns {Promise<Buffer>}
   */
  async generateRankCard(data) {
    // This would be implemented with @napi-rs/canvas
    // For now, return a placeholder
    return Buffer.from('placeholder');
  }
}

export const levelingService = new LevelingService();
export default levelingService;