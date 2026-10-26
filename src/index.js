/**
 * StellarSentry - Main Entry Point
 * Starts the Discord bot and web dashboard in a single process
 *
 * For sharding support, use: node src/shard.js (requires SHARDING_ENABLED=true)
 */

import { loadEnv } from './config/env.js';
import { connectDatabase } from './database/connection.js';
import { createDashboardServer } from './dashboard/server/server.js';
import { loadCommands } from './loaders/commandLoader.js';
import { loadEvents } from './loaders/eventLoader.js';
import { loadComponents } from './loaders/componentLoader.js';
import { loadRoutes } from './loaders/routeLoader.js';
import { client } from './core/client.js';
import { eventBus, EVENTS } from './core/eventBus.js';
import { logger } from './utils/logger.js';
import { musicService } from './services/music.service.js';
import { moderationService } from './services/moderation.service.js';
import { automodService } from './services/automod.service.js';
import { levelingService } from './services/leveling.service.js';
import { ticketService } from './services/ticket.service.js';
import { guildService } from './services/guild.service.js';
import { giveawayService } from './services/giveaway.service.js';
import { reminderService } from './services/reminder.service.js';
import { schedulerService } from './services/scheduler.service.js';
import { guildRepository } from './database/repositories/GuildRepository.js';
import { CronCreate } from './utils/cron.js';

/**
 * Main startup function
 */
async function main() {
  try {
    // Load and validate environment variables
    loadEnv();
    logger.info('Starting StellarSentry...');

    // Connect to database
    await connectDatabase();
    logger.info('Database connected');

    // Initialize services that need database connection
    await guildService.initialize();
    logger.info('Guild service initialized');

    // Load bot components
    await loadCommands();
    logger.info('Commands loaded');

    await loadEvents();
    logger.info('Events loaded');

    await loadComponents();
    logger.info('Components loaded');

    // Initialize music service (connects to Lavalink)
    try {
      await musicService.initialize(client);
      logger.info('Music service initialized');
    } catch (error) {
      logger.warn({ err: error }, 'Music service initialization failed (Lavalink may not be running)');
    }

    // Initialize other services
    try {
      await giveawayService.initialize(client);
      logger.info('Giveaway service initialized');
    } catch (error) {
      logger.warn({ err: error }, 'Giveaway service initialization failed');
    }

    try {
      await reminderService.initialize(client);
      logger.info('Reminder service initialized');
    } catch (error) {
      logger.warn({ err: error }, 'Reminder service initialization failed');
    }

    try {
      await schedulerService.initialize(client);
      logger.info('Scheduler service initialized');
    } catch (error) {
      logger.warn({ err: error }, 'Scheduler service initialization failed');
    }

    // Create and start dashboard server
    const { app, server, io } = createDashboardServer(client);

    // Load dashboard routes
    await loadRoutes(app);
    logger.info('Dashboard routes loaded');

    // Start HTTP server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT }, 'Dashboard server started');
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);

    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);
    logger.info('Bot logged in successfully');

    // Set up periodic tasks
    setupPeriodicTasks();

  } catch (error) {
    logger.error({ err: error }, 'Failed to start StellarSentry');
    process.exit(1);
  }
}

/**
 * Set up periodic background tasks
 */
function setupPeriodicTasks() {
  // Check reminders every minute
  setInterval(async () => {
    try {
      await reminderService.checkReminders(client);
    } catch (error) {
      logger.error({ err: error }, 'Reminder check failed');
    }
  }, 60 * 1000);

  // Check giveaways every 30 seconds
  setInterval(async () => {
    try {
      await giveawayService.checkGiveaways(client);
    } catch (error) {
      logger.error({ err: error }, 'Giveaway check failed');
    }
  }, 30 * 1000);

  // Check temp bans/roles every minute
  setInterval(async () => {
    try {
      await schedulerService.checkTempBans(client);
      await schedulerService.checkTempRoles(client);
    } catch (error) {
      logger.error({ err: error }, 'Temp ban/role check failed');
    }
  }, 60 * 1000);

  // Update guild metadata every 10 minutes
  setInterval(async () => {
    try {
      for (const guild of client.guilds.cache.values()) {
        await guildRepository.updateMetadata(guild.id, {
          name: guild.name,
          icon: guild.icon,
          memberCount: guild.memberCount,
          ownerId: guild.ownerId,
        });
      }
    } catch (error) {
      logger.error({ err: error }, 'Guild metadata update failed');
    }
  }, 10 * 60 * 1000);

  logger.info('Periodic tasks scheduled');
}

/**
 * Graceful shutdown handler
 * @param {http.Server} server
 */
function setupGracefulShutdown(server) {
  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down gracefully...');

    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Shutdown services
    try {
      await musicService.shutdown();
      logger.info('Music service shut down');
    } catch (error) {
      logger.error({ err: error }, 'Music service shutdown error');
    }

    // Disconnect from Discord
    client.destroy();
    logger.info('Discord client disconnected');

    // Close database connection
    try {
      const { gracefulShutdown } = await import('./database/connection.js');
      await gracefulShutdown();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error({ err: error }, 'Database shutdown error');
    }

    logger.info('Graceful shutdown complete');
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle unhandled errors
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ err: reason, promise }, 'Unhandled rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
}

// Start the application
main();

export { main };