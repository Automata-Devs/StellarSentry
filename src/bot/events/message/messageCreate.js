/**
 * Message Create Event - Handle XP gain, automod, etc.
 */
import { EmbedBuilder } from 'discord.js';
import { client } from '../../../core/client.js';
import { logger } from '../../../utils/logger.js';
import { eventBus, EVENTS } from '../../../core/eventBus.js';
import { isFeatureEnabled } from '../../../services/guild.service.js';
import { automodService } from '../../../services/automod.service.js';
import { levelingService } from '../../../services/leveling.service.js';

export default {
  name: 'messageCreate',
  once: false,
  async execute(message) {
    // Ignore bots, DMs, and system messages
    if (message.author.bot || !message.guild || message.system) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    try {
      // Handle automod
      if (await isFeatureEnabled(guildId, 'automod')) {
        const automodResult = await automodService.checkMessage(message);
        if (automodResult.triggered) {
          // Message was deleted or action taken
          return;
        }
      }

      // Handle leveling XP
      if (await isFeatureEnabled(guildId, 'leveling')) {
        const result = await levelingService.addXp(guildId, userId, 1); // Base amount, will be multiplied in service
        if (result.leveledUp) {
          // Level up handled in service
        }
      }
    } catch (error) {
      logger.error({ err: error, guildId, userId }, 'Message create error');
    }
  },
};