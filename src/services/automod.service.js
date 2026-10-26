/**
 * AutoMod Service - Automated moderation
 * Handles spam, links, bad words, mass mentions, caps lock
 */
import { guildRepository } from '../database/repositories/GuildRepository.js';
import { memberRepository } from '../database/repositories/MemberRepository.js';
import { AuditLog } from '../database/models/AuditLog.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { logger } from '../utils/logger.js';
import { botCanModerate } from '../core/permissions.js';
import { formatTime } from '../utils/time.js';

class AutoModService {
  /**
   * Check message against automod rules
   * @param {Object} params
   * @returns {Promise<Object>} { action: 'delete'|'warn'|'timeout'|null, reason, rule }
   */
  async checkMessage({ guild, member, message, guildSettings }) {
    const automod = guildSettings?.automod;
    if (!automod?.enabled) return { action: null };

    // Check whitelisted roles
    if (automod.whitelistedRoles?.length > 0) {
      const hasWhitelisted = member.roles.cache.some(r => automod.whitelistedRoles.includes(r.id));
      if (hasWhitelisted) return { action: null };
    }

    // Check whitelisted channels
    if (automod.whitelistedChannels?.length > 0) {
      if (automod.whitelistedChannels.includes(message.channel.id)) return { action: null };
    }

    // Check each rule
    const checks = [
      () => this.checkAntiSpam(message, automod.antiSpam, member),
      () => this.checkAntiLinks(message, automod.antiLinks),
      () => this.checkBlacklistedWords(message, automod.blacklistedWords),
      () => this.checkMassMentions(message, automod.massMentions),
      () => this.checkCapsLock(message, automod.capsLock),
    ];

    for (const check of checks) {
      const result = await check();
      if (result.action) {
        await this.executeAction({ guild, member, message, ...result, guildSettings });
        return result;
      }
    }

    return { action: null };
  }

  /**
   * Check anti-spam
   */
  async checkAntiSpam(message, config, member) {
    if (!config?.enabled) return { action: null };

    // Simple spam detection: same content within interval
    // In production, use a more sophisticated approach with message history
    return { action: null };
  }

  /**
   * Check anti-links
   */
  async checkAntiLinks(message, config) {
    if (!config?.enabled) return { action: null };

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = message.content.match(urlRegex);

    if (matches) {
      // Check whitelist
      const whitelist = config.whitelist || [];
      const hasNonWhitelisted = matches.some(url => !whitelist.some(w => url.includes(w)));

      if (hasNonWhitelisted) {
        return { action: config.action || 'delete', reason: 'Links are not allowed', rule: 'antiLinks' };
      }
    }

    return { action: null };
  }

  /**
   * Check blacklisted words
   */
  async checkBlacklistedWords(message, config) {
    if (!config?.enabled) return { action: null };

    const words = config.words || [];
    const content = message.content.toLowerCase();

    for (const word of words) {
      if (content.includes(word.toLowerCase())) {
        return { action: config.action || 'delete', reason: `Message contains blacklisted word: ${word}`, rule: 'blacklistedWords' };
      }
    }

    return { action: null };
  }

  /**
   * Check mass mentions
   */
  async checkMassMentions(message, config) {
    if (!config?.enabled) return { action: null };

    const mentionCount = (message.mentions.users.size + message.mentions.roles.size);

    if (mentionCount >= (config.maxMentions || 5)) {
      return { action: config.action || 'delete', reason: `Too many mentions (${mentionCount})`, rule: 'massMentions' };
    }

    return { action: null };
  }

  /**
   * Check caps lock
   */
  async checkCapsLock(message, config) {
    if (!config?.enabled) return { action: null };

    const minLength = config.minLength || 10;
    const maxPercent = config.maxPercent || 70;

    if (message.content.length < minLength) return { action: null };

    // Count letters
    const letters = message.content.match(/[a-zA-Z]/g);
    if (!letters || letters.length < minLength) return { action: null };

    const upperCount = letters.filter(c => c === c.toUpperCase()).length;
    const percent = (upperCount / letters.length) * 100;

    if (percent >= maxPercent) {
      return { action: config.action || 'delete', reason: `Excessive caps (${Math.round(percent)}%)`, rule: 'capsLock' };
    }

    return { action: null };
  }

  /**
   * Execute automod action
   */
  async executeAction({ guild, member, message, action, reason, rule, guildSettings }) {
    try {
      const botCheck = botCanModerate(guild, member);
      if (!botCheck.canModerate) {
        logger.warn({ guildId: guild.id, userId: member.id }, 'Bot cannot moderate user for automod');
        return;
      }

      let caseNumber = null;

      switch (action) {
        case 'delete':
          await message.delete().catch(() => {});
          break;

        case 'warn':
          await message.delete().catch(() => {});
          caseNumber = await guildRepository.incrementSetting(guild.id, 'moderation.caseNumber', 1);
          await this.warnUser(guild, member, reason, caseNumber);
          break;

        case 'timeout':
          await message.delete().catch(() => {});
          caseNumber = await guildRepository.incrementSetting(guild.id, 'moderation.caseNumber', 1);
          await this.timeoutUser(guild, member, reason, 5 * 60 * 1000, caseNumber); // 5 min default
          break;
      }

      // Log action
      if (caseNumber) {
        await AuditLog.create({
          guildId: guild.id,
          userId: member.id,
          eventType: `automod_${rule}`,
          eventCategory: 'moderation',
          reason: `AutoMod: ${reason}`,
          caseNumber,
          data: { rule, action, messageId: message.id, channelId: message.channel.id },
          severity: action === 'timeout' ? 'medium' : 'low',
        });
      }

      eventBus.emit('automod:trigger', { guildId: guild.id, userId: member.id, action, reason, rule });

    } catch (error) {
      logger.error({ err: error, guildId: guild.id, userId: member.id }, 'Failed to execute automod action');
    }
  }

  /**
   * Warn user via automod
   */
  async warnUser(guild, member, reason, caseNumber) {
    try {
      await member.send({
        embeds: [{
          title: 'AutoMod Warning',
          description: `You have been warned in **${guild.name}**.\n**Reason:** ${reason}`,
          color: 0xFAA61A,
          timestamp: new Date(),
        }],
      }).catch(() => {});
    } catch (error) {
      logger.debug({ err: error }, 'Failed to DM automod warning');
    }
  }

  /**
   * Timeout user via automod
   */
  async timeoutUser(guild, member, reason, duration, caseNumber) {
    try {
      await member.timeout(duration, `AutoMod: ${reason}`).catch(() => {});
    } catch (error) {
      logger.debug({ err: error }, 'Failed to timeout user via automod');
    }
  }

  /**
   * Get automod configuration for guild
   */
  async getConfig(guildId) {
    const guild = await guildRepository.getByGuildId(guildId);
    return guild?.automod || {};
  }

  /**
   * Update automod configuration
   */
  async updateConfig(guildId, config) {
    return guildRepository.updateSettings(guildId, { automod: config });
  }

  /**
   * Enable/disable automod
   */
  async toggle(guildId, enabled) {
    return guildRepository.updateSettings(guildId, { 'automod.enabled': enabled });
  }

  /**
   * Add word to blacklist
   */
  async addBlacklistedWord(guildId, word) {
    return guildRepository.pushToArraySetting(guildId, 'automod.blacklistedWords.words', word.toLowerCase());
  }

  /**
   * Remove word from blacklist
   */
  async removeBlacklistedWord(guildId, word) {
    return guildRepository.pullFromArraySetting(guildId, 'automod.blacklistedWords.words', word.toLowerCase());
  }

  /**
   * Add domain to link whitelist
   */
  async addLinkWhitelist(guildId, domain) {
    return guildRepository.pushToArraySetting(guildId, 'automod.antiLinks.whitelist', domain);
  }

  /**
   * Remove domain from link whitelist
   */
  async removeLinkWhitelist(guildId, domain) {
    return guildRepository.pullFromArraySetting(guildId, 'automod.antiLinks.whitelist', domain);
  }

  /**
   * Add whitelisted role
   */
  async addWhitelistedRole(guildId, roleId) {
    return guildRepository.pushToArraySetting(guildId, 'automod.whitelistedRoles', roleId);
  }

  /**
   * Remove whitelisted role
   */
  async removeWhitelistedRole(guildId, roleId) {
    return guildRepository.pullFromArraySetting(guildId, 'automod.whitelistedRoles', roleId);
  }

  /**
   * Add whitelisted channel
   */
  async addWhitelistedChannel(guildId, channelId) {
    return guildRepository.pushToArraySetting(guildId, 'automod.whitelistedChannels', channelId);
  }

  /**
   * Remove whitelisted channel
   */
  async removeWhitelistedChannel(guildId, channelId) {
    return guildRepository.pullFromArraySetting(guildId, 'automod.whitelistedChannels', channelId);
  }
}

export const automodService = new AutoModService();
export default automodService;