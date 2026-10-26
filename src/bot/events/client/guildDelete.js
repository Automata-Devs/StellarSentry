/**
 * Guild Delete Event - Bot left or was removed from a guild
 */
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';
import { eventBus, EVENTS } from '../../../core/eventBus.js';

export default {
  name: 'guildDelete',
  once: false,
  async execute(guild) {
    logger.info({ guildId: guild.id, name: guild.name }, 'Left guild');

    // Mark guild as left in database
    await guildService.markLeft(guild.id);

    // Emit event
    eventBus.emit(EVENTS.GUILD_DELETE, { guildId: guild.id, name: guild.name });
  },
};