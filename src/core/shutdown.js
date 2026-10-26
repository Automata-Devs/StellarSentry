/**
 * Graceful shutdown handler
 * Handles SIGTERM, SIGINT, and uncaught errors
 */
import { logger } from '../utils/logger.js';
import { client } from './client.js';
import { eventBus } from './eventBus.js';
import { gracefulShutdown as dbShutdown } from '../database/connection.js';
import { cooldownManager } from './cooldowns.js';

let isShuttingDown = false;
let shutdownPromise = null;

/**
 * Perform graceful shutdown
 * @param {string} signal - Signal that triggered shutdown
 * @param {Error} error - Optional error that triggered shutdown
 */
export async function gracefulShutdown(signal = 'UNKNOWN', error = null) {
  if (isShuttingDown) {
    logger.warn({ signal }, 'Shutdown already in progress');
    return shutdownPromise;
  }

  isShuttingDown = true;
  client.isShuttingDown = true;

  logger.info({ signal }, 'Starting graceful shutdown...');

  shutdownPromise = (async () => {
    const startTime = Date.now();

    try {
      // 1. Stop accepting new work
      logger.info('Stopping event listeners...');
      eventBus.emit(EVENTS.BOT_SHUTDOWN, { signal, timestamp: new Date() });

      // 2. Wait for pending operations (with timeout)
      logger.info('Waiting for pending operations...');
      await waitForPendingOperations(5000);

      // 3. Leave voice channels
      logger.info('Leaving voice channels...');
      await leaveVoiceChannels();

      // 4. Save critical data
      logger.info('Saving critical data...');
      await saveCriticalData();

      // 5. Close Discord connection
      logger.info('Closing Discord connection...');
      if (client.isReady()) {
        await client.destroy();
      }

      // 6. Close database connection
      logger.info('Closing database connection...');
      await dbShutdown();

      // 7. Clear caches
      logger.info('Clearing caches...');
      clearCaches();

      const duration = Date.now() - startTime;
      logger.info({ duration: `${duration}ms` }, 'Graceful shutdown completed');

      // Exit process
      process.exit(error ? 1 : 0);
    } catch (shutdownError) {
      logger.error({ err: shutdownError }, 'Error during shutdown');
      process.exit(1);
    }
  })();

  return shutdownPromise;
}

/**
 * Wait for pending operations to complete
 * @param {number} timeout
 */
async function waitForPendingOperations(timeout = 5000) {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      logger.warn('Timeout waiting for pending operations');
      resolve();
    }, timeout);

    // In a real implementation, you'd track pending operations
    // For now, just wait a bit
    setTimeout(() => {
      clearTimeout(timer);
      resolve();
    }, 100);
  });
}

/**
 * Leave all voice channels
 */
async function leaveVoiceChannels() {
  try {
    for (const [, connection] of client.voice?.connections || new Map()) {
      try {
        connection.destroy();
      } catch (err) {
        logger.debug({ err }, 'Error destroying voice connection');
      }
    }
    // Also clear any Lavalink players
    if (client.services?.music) {
      await client.services.music.destroyAllPlayers();
    }
  } catch (error) {
    logger.error({ err: error }, 'Error leaving voice channels');
  }
}

/**
 * Save critical data before shutdown
 */
async function saveCriticalData() {
  try {
    // Save any pending reminders, giveaway states, etc.
    // This would be implemented based on your services
    if (client.services?.giveaway) {
      await client.services.giveaway.saveAllStates();
    }
    if (client.services?.reminder) {
      await client.services.reminder.saveAllStates();
    }
    if (client.services?.music) {
      await client.services.music.saveAllStates();
    }
  } catch (error) {
    logger.error({ err: error }, 'Error saving critical data');
  }
}

/**
 * Clear all caches
 */
function clearCaches() {
  cooldownManager.cache.clearAll();
  // Clear any other caches
}

/**
 * Setup process signal handlers
 */
export function setupShutdownHandlers() {
  // Handle SIGTERM (platform shutdown)
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    gracefulShutdown('UNCAUGHT_EXCEPTION', error);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled rejection');
    // Don't shutdown on unhandled rejection in production, just log
    if (process.env.NODE_ENV !== 'production') {
      gracefulShutdown('UNHANDLED_REJECTION', reason instanceof Error ? reason : new Error(String(reason)));
    }
  });

  // Handle warnings
  process.on('warning', (warning) => {
    logger.warn({ warning: warning.message, stack: warning.stack }, 'Process warning');
  });

  logger.info('Shutdown handlers registered');
}

/**
 * Check if shutdown is in progress
 * @returns {boolean}
 */
export function isShutdownInProgress() {
  return isShuttingDown;
}

/**
 * Force shutdown (for emergency)
 */
export function forceShutdown(exitCode = 1) {
  logger.error('Force shutdown initiated');
  process.exit(exitCode);
}

// Import EVENTS from eventBus
import { EVENTS } from './eventBus.js';

export default {
  gracefulShutdown,
  setupShutdownHandlers,
  isShutdownInProgress,
  forceShutdown,
};