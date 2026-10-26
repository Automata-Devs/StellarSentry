/**
 * Ready Event - Bot is ready
 */
import { ActivityType } from 'discord.js';
import { client } from '../../../core/client.js';
import { logger } from '../../../utils/logger.js';
import { eventBus, EVENTS } from '../../../core/eventBus.js';
import { env } from '../../../config/env.js';

export default {
  name: 'ready',
  once: true,
  async execute(clientInstance) {
    logger.info({ user: clientInstance.user.tag, id: clientInstance.user.id }, 'Bot is ready!');

    // Set presence
    clientInstance.user.setPresence({
      activities: [{
        name: 'StellarSentry | /help',
        type: ActivityType.Watching,
      }],
      status: 'online',
    });

    // Register commands
    try {
      if (env.DISCORD_DEV_GUILD_ID) {
        const guild = clientInstance.guilds.cache.get(env.DISCORD_DEV_GUILD_ID);
        if (guild) {
          await guild.commands.set(Array.from(clientInstance.commands.values()).map(c => c.data.toJSON()));
          logger.info('Development guild commands registered');
        }
      } else {
        await clientInstance.application.commands.set(Array.from(clientInstance.commands.values()).map(c => c.data.toJSON()));
        logger.info('Global commands registered');
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to register commands');
    }

    // Initialize services
    try {
      const { musicService } = await import('../../../services/music.service.js');
      await musicService.initialize(clientInstance);
      logger.info('Music service initialized');
    } catch (error) {
      logger.warn({ err: error }, 'Music service initialization failed (Lavalink may not be running)');
    }

    // Initialize giveaway scheduler
    try {
      const { giveawayService } = await import('../../../services/giveaway.service.js');
      await giveawayService.initialize(clientInstance);
      logger.info('Giveaway service initialized');
    } catch (error) {
      logger.warn({ err: error }, 'Giveaway service initialization failed');
    }

    // Initialize reminder scheduler
    try {
      const { reminderService } = await import('../../../services/reminder.service.js');
      await reminderService.initialize(clientInstance);
      logger.info('Reminder service initialized');
    } catch (error) {
      logger.warn({ err: error }, 'Reminder service initialization failed');
    }

    // Initialize temp role/ban scheduler
    try {
      const { schedulerService } = await import('../../../services/scheduler.service.js');
      await schedulerService.initialize(clientInstance);
      logger.info('Scheduler service initialized');
    } catch (error) {
      logger.warn({ err: error }, 'Scheduler service initialization failed');
    }

    // Emit ready event
    eventBus.emit(EVENTS.BOT_READY, { client: clientInstance });

    // Log cache stats
    const cacheStats = clientInstance.getCacheStats();
    logger.info({ ...cacheStats, uptime: clientInstance.getFormattedUptime() }, 'Cache statistics');

    // Log guild count
    logger.info({ guilds: clientInstance.guilds.cache.size }, 'Connected to guilds');
  },
};