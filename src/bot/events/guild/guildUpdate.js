/**
 * Guild Update Event - Log guild updates
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'guildUpdate',
  once: false,
  async execute(oldGuild, newGuild) {
    try {
      const settings = await guildService.getGuild(newGuild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled) return;

      // Update guild metadata in database
      await guildService.updateMetadata(newGuild.id, {
        name: newGuild.name,
        icon: newGuild.icon,
        memberCount: newGuild.memberCount,
      });

      // Log if there's a general log channel for guild updates
      // This would need a specific channel config, for now just update metadata
    } catch (error) {
      logger.error({ err: error, guildId: newGuild.id }, 'Guild update error');
    }
  },
};