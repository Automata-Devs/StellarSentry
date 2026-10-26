/**
 * Moderation Service - Business logic for moderation actions
 * Handles bans, kicks, timeouts, warns, purges, etc.
 */
import { guildRepository } from '../database/repositories/GuildRepository.js';
import { memberRepository } from '../database/repositories/MemberRepository.js';
import { Warning } from '../database/models/Warning.js';
import { AuditLog } from '../database/models/AuditLog.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { logger } from '../utils/logger.js';
import { canModerate, botCanModerate } from '../core/permissions.js';
import { formatTime } from '../utils/time.js';

class ModerationService {
  /**
   * Ban a user
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async ban({ guild, moderator, target, reason, deleteDays = 0, dm = true }) {
    // Check permissions
    const permCheck = canModerate(moderator, target);
    if (!permCheck.canModerate) {
      throw new Error(permCheck.reason);
    }

    const botCheck = botCanModerate(guild, target);
    if (!botCheck.canModerate) {
      throw new Error(botCheck.reason);
    }

    // Get next case number
    const caseNumber = await guildRepository.incrementSetting(guild.id, 'moderation.caseNumber', 1);

    try {
      // DM user before ban
      if (dm) {
        try {
          await target.send({
            embeds: [{
              title: 'You have been banned',
              description: `You have been banned from **${guild.name}**.\n**Reason:** ${reason}`,
              color: 0xED4245,
              timestamp: new Date(),
            }],
          });
        } catch (dmError) {
          logger.debug({ userId: target.id, err: dmError }, 'Failed to DM banned user');
        }
      }

      // Execute ban
      await guild.members.ban(target, { reason, deleteMessageSeconds: deleteDays * 86400 });

      // Log to database
      await this.logModeration({
        guildId: guild.id,
        userId: target.id,
        moderatorId: moderator.id,
        action: 'ban',
        reason,
        caseNumber,
        metadata: { deleteDays },
      });

      // Update member record
      await memberRepository.addNote(guild.id, target.id, moderator.id, `Banned: ${reason}`);

      // Emit event
      eventBus.emit(EVENTS.MOD_BAN, { guildId: guild.id, userId: target.id, moderatorId: moderator.id, reason, caseNumber });

      return { success: true, caseNumber };
    } catch (error) {
      logger.error({ err: error, guildId: guild.id, targetId: target.id }, 'Failed to ban user');
      throw error;
    }
  }

  /**
   * Unban a user
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async unban({ guild, moderator, userId, reason, caseNumber }) {
    try {
      await guild.members.unban(userId, reason);

      await this.logModeration({
        guildId: guild.id,
        userId,
        moderatorId: moderator.id,
        action: 'unban',
        reason,
        caseNumber,
      });

      eventBus.emit(EVENTS.MOD_BAN, { guildId: guild.id, userId, moderatorId: moderator.id, reason, caseNumber, type: 'unban' });

      return { success: true };
    } catch (error) {
      logger.error({ err: error, guildId: guild.id, userId }, 'Failed to unban user');
      throw error;
    }
  }

  /**
   * Kick a user
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async kick({ guild, moderator, target, reason, dm = true }) {
    const permCheck = canModerate(moderator, target);
    if (!permCheck.canModerate) {
      throw new Error(permCheck.reason);
    }

    const botCheck = botCanModerate(guild, target);
    if (!botCheck.canModerate) {
      throw new Error(botCheck.reason);
    }

    const caseNumber = await guildRepository.incrementSetting(guild.id, 'moderation.caseNumber', 1);

    try {
      if (dm) {
        try {
          await target.send({
            embeds: [{
              title: 'You have been kicked',
              description: `You have been kicked from **${guild.name}**.\n**Reason:** ${reason}`,
              color: 0xFAA61A,
              timestamp: new Date(),
            }],
          });
        } catch (dmError) {
          logger.debug({ userId: target.id, err: dmError }, 'Failed to DM kicked user');
        }
      }

      await target.kick(reason);

      await this.logModeration({
        guildId: guild.id,
        userId: target.id,
        moderatorId: moderator.id,
        action: 'kick',
        reason,
        caseNumber,
      });

      await memberRepository.addNote(guild.id, target.id, moderator.id, `Kicked: ${reason}`);

      eventBus.emit(EVENTS.MOD_KICK, { guildId: guild.id, userId: target.id, moderatorId: moderator.id, reason, caseNumber });

      return { success: true, caseNumber };
    } catch (error) {
      logger.error({ err: error, guildId: guild.id, targetId: target.id }, 'Failed to kick user');
      throw error;
    }
  }

  /**
   * Timeout a user
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async timeout({ guild, moderator, target, duration, reason, dm = true }) {
    const permCheck = canModerate(moderator, target);
    if (!permCheck.canModerate) {
      throw new Error(permCheck.reason);
    }

    const botCheck = botCanModerate(guild, target);
    if (!botCheck.canModerate) {
      throw new Error(botCheck.reason);
    }

    // Check if already timed out
    if (target.isCommunicationDisabled()) {
      throw new Error('User is already timed out');
    }

    const caseNumber = await guildRepository.incrementSetting(guild.id, 'moderation.caseNumber', 1);
    const endsAt = new Date(Date.now() + duration);

    try {
      if (dm) {
        try {
          await target.send({
            embeds: [{
              title: 'You have been timed out',
              description: `You have been timed out in **${guild.name}** for **${formatTime(duration)}**.\n**Reason:** ${reason}`,
              color: 0xFAA61A,
              timestamp: new Date(),
            }],
          });
        } catch (dmError) {
          logger.debug({ userId: target.id, err: dmError }, 'Failed to DM timed out user');
        }
      }

      await target.timeout(duration, reason);

      // Store in member record
      await memberRepository.addTimeout(guild.id, target.id, {
        caseNumber,
        moderatorId: moderator.id,
        reason,
        duration,
        endsAt,
      });

      await this.logModeration({
        guildId: guild.id,
        userId: target.id,
        moderatorId: moderator.id,
        action: 'timeout',
        reason,
        caseNumber,
        metadata: { duration, endsAt },
      });

      eventBus.emit(EVENTS.MOD_TIMEOUT, { guildId: guild.id, userId: target.id, moderatorId: moderator.id, reason, caseNumber, duration });

      return { success: true, caseNumber, endsAt };
    } catch (error) {
      logger.error({ err: error, guildId: guild.id, targetId: target.id }, 'Failed to timeout user');
      throw error;
    }
  }

  /**
   * Remove timeout
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async removeTimeout({ guild, moderator, target, reason, caseNumber }) {
    try {
      await target.disableCommunicationUntil(null);

      await memberRepository.removeTimeout(guild.id, target.id, caseNumber);

      await this.logModeration({
        guildId: guild.id,
        userId: target.id,
        moderatorId: moderator.id,
        action: 'timeout_remove',
        reason,
        caseNumber,
      });

      return { success: true };
    } catch (error) {
      logger.error({ err: error, guildId: guild.id, targetId: target.id }, 'Failed to remove timeout');
      throw error;
    }
  }

  /**
   * Warn a user
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async warn({ guild, moderator, target, reason, dm = true }) {
    const caseNumber = await guildRepository.incrementSetting(guild.id, 'moderation.caseNumber', 1);

    try {
      if (dm) {
        try {
          await target.send({
            embeds: [{
              title: 'You have been warned',
              description: `You have been warned in **${guild.name}**.\n**Reason:** ${reason}`,
              color: 0xFAA61A,
              timestamp: new Date(),
            }],
          });
        } catch (dmError) {
          logger.debug({ userId: target.id, err: dmError }, 'Failed to DM warned user');
        }
      }

      // Add to member warnings
      await memberRepository.addWarning(guild.id, target.id, {
        caseNumber,
        moderatorId: moderator.id,
        reason,
        severity: 'low',
      });

      // Also create standalone warning record
      await Warning.create({
        guildId: guild.id,
        userId: target.id,
        moderatorId: moderator.id,
        caseNumber,
        reason,
        severity: 'low',
      });

      await this.logModeration({
        guildId: guild.id,
        userId: target.id,
        moderatorId: moderator.id,
        action: 'warn',
        reason,
        caseNumber,
      });

      eventBus.emit(EVENTS.MOD_WARN, { guildId: guild.id, userId: target.id, moderatorId: moderator.id, reason, caseNumber });

      return { success: true, caseNumber };
    } catch (error) {
      logger.error({ err: error, guildId: guild.id, targetId: target.id }, 'Failed to warn user');
      throw error;
    }
  }

  /**
   * Purge messages
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async purge({ channel, moderator, amount, filter = {} }) {
    if (amount > 100) amount = 100;

    try {
      const messages = await channel.messages.fetch({ limit: amount });

      let filtered = messages;

      if (filter.user) {
        filtered = filtered.filter(m => m.author.id === filter.user);
      }
      if (filter.contains) {
        filtered = filtered.filter(m => m.content.includes(filter.contains));
      }
      if (filter.bots !== undefined) {
        filtered = filtered.filter(m => m.author.bot === filter.bots);
      }

      const toDelete = filtered.first(amount);
      if (toDelete.length === 0) {
        return { success: true, deleted: 0 };
      }

      const deleted = await channel.bulkDelete(toDelete, true);

      await this.logModeration({
        guildId: channel.guild.id,
        userId: moderator.id,
        moderatorId: moderator.id,
        action: 'purge',
        reason: `Purged ${deleted.size} messages${filter.user ? ` from <@${filter.user}>` : ''}${filter.contains ? ` containing "${filter.contains}"` : ''}`,
        caseNumber: await guildRepository.incrementSetting(channel.guild.id, 'moderation.caseNumber', 1),
        metadata: { deleted: deleted.size, filter },
      });

      eventBus.emit(EVENTS.MOD_PURGE, { guildId: channel.guild.id, channelId: channel.id, moderatorId: moderator.id, deleted: deleted.size });

      return { success: true, deleted: deleted.size };
    } catch (error) {
      logger.error({ err: error, channelId: channel.id }, 'Failed to purge messages');
      throw error;
    }
  }

  /**
   * Set slowmode
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async setSlowmode({ channel, moderator, duration, reason }) {
    try {
      await channel.setRateLimitPerUser(duration, reason);

      await this.logModeration({
        guildId: channel.guild.id,
        userId: moderator.id,
        moderatorId: moderator.id,
        action: duration > 0 ? 'slowmode_set' : 'slowmode_removed',
        reason: reason || `Slowmode ${duration > 0 ? 'set to' : 'removed'} ${formatTime(duration * 1000)}`,
        caseNumber: await guildRepository.incrementSetting(channel.guild.id, 'moderation.caseNumber', 1),
        metadata: { channelId: channel.id, duration },
      });

      return { success: true };
    } catch (error) {
      logger.error({ err: error, channelId: channel.id }, 'Failed to set slowmode');
      throw error;
    }
  }

  /**
   * Lock channel
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async lock({ channel, moderator, reason }) {
    try {
      const everyoneRole = channel.guild.roles.everyone;
      await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false }, { reason });

      await this.logModeration({
        guildId: channel.guild.id,
        userId: moderator.id,
        moderatorId: moderator.id,
        action: 'lock',
        reason,
        caseNumber: await guildRepository.incrementSetting(channel.guild.id, 'moderation.caseNumber', 1),
        metadata: { channelId: channel.id },
      });

      return { success: true };
    } catch (error) {
      logger.error({ err: error, channelId: channel.id }, 'Failed to lock channel');
      throw error;
    }
  }

  /**
   * Unlock channel
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async unlock({ channel, moderator, reason }) {
    try {
      const everyoneRole = channel.guild.roles.everyone;
      await channel.permissionOverwrites.delete(everyoneRole, reason);

      await this.logModeration({
        guildId: channel.guild.id,
        userId: moderator.id,
        moderatorId: moderator.id,
        action: 'unlock',
        reason,
        caseNumber: await guildRepository.incrementSetting(channel.guild.id, 'moderation.caseNumber', 1),
        metadata: { channelId: channel.id },
      });

      return { success: true };
    } catch (error) {
      logger.error({ err: error, channelId: channel.id }, 'Failed to unlock channel');
      throw error;
    }
  }

  /**
   * Log moderation action
   * @param {Object} params
   */
  async logModeration({ guildId, userId, moderatorId, action, reason, caseNumber, metadata = {} }) {
    try {
      await AuditLog.create({
        guildId,
        userId,
        moderatorId,
        eventType: action,
        eventCategory: 'moderation',
        reason,
        caseNumber,
        data: metadata,
        severity: ['ban', 'kick'].includes(action) ? 'high' : action === 'timeout' ? 'medium' : 'low',
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to log moderation action');
    }
  }

  /**
   * Get moderation stats for guild
   * @param {string} guildId
   * @param {number} days
   * @returns {Promise<Object>}
   */
  async getStats(guildId, days = 30) {
    // This would query AuditLog for moderation stats
    return { bans: 0, kicks: 0, timeouts: 0, warns: 0, purges: 0 };
  }
}

export const moderationService = new ModerationService();
export default moderationService;