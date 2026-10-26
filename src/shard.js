/**
 * Sharding Entry Point - Optional sharding support for large bots
 * Only enabled when SHARDING_ENABLED=true
 *
 * Usage:
 * - Set SHARDING_ENABLED=true in .env
 * - Run with: node src/shard.js
 * - Or use PM2: pm2 start src/shard.js --name stellarsentry
 */

import { ShardingManager } from 'discord.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { eventBus, EVENTS } from './core/eventBus.js';

// Validate environment
if (!env.SHARDING_ENABLED) {
  logger.warn('Sharding is disabled. Set SHARDING_ENABLED=true to enable.');
  process.exit(1);
}

if (!env.DISCORD_TOKEN) {
  logger.error('DISCORD_TOKEN is required for sharding');
  process.exit(1);
}

const manager = new ShardingManager('./src/index.js', {
  token: env.DISCORD_TOKEN,
  totalShards: 'auto', // Automatically determine based on guild count
  respawn: true, // Respawn dead shards
  mode: 'process', // Use child processes
});

// Shard events
manager.on('shardCreate', shard => {
  logger.info({ shardId: shard.id }, 'Shard created');

  shard.on('ready', () => {
    logger.info({ shardId: shard.id }, 'Shard ready');
  });

  shard.on('disconnect', (event) => {
    logger.warn({ shardId: shard.id, code: event.code, reason: event.reason }, 'Shard disconnected');
  });

  shard.on('reconnecting', () => {
    logger.info({ shardId: shard.id }, 'Shard reconnecting');
  });

  shard.on('error', error => {
    logger.error({ shardId: shard.id, err: error }, 'Shard error');
  });
});

// Manager events
manager.on('shardDisconnect', (event, shardId) => {
  logger.warn({ shardId, code: event.code, reason: event.reason }, 'Shard disconnected');
});

manager.on('shardReconnecting', shardId => {
  logger.info({ shardId }, 'Shard reconnecting');
});

manager.on('shardReady', shardId => {
  logger.info({ shardId }, 'Shard ready');
});

manager.on('shardError', (error, shardId) => {
  logger.error({ shardId, err: error }, 'Shard error');
});

// Spawn shards
async function spawnShards() {
  try {
    logger.info('Starting shard manager...');

    const shards = await manager.spawn({
      amount: 'auto', // Automatically determine based on guild count
      delay: 5000, // 5 second delay between shard spawns
      timeout: 30000, // 30 second timeout per shard
    });

    logger.info({ count: shards.size }, 'All shards spawned successfully');

    // Broadcast to all shards when all are ready
    let readyCount = 0;
    manager.on('shardReady', () => {
      readyCount++;
      if (readyCount === shards.size) {
        logger.info('All shards ready!');
        // Emit event for other services
        eventBus.emit(EVENTS.BOT_READY, {
          shardCount: shards.size,
          timestamp: new Date()
        });
      }
    });

  } catch (error) {
    logger.error({ err: error }, 'Failed to spawn shards');
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down shard manager...');

  try {
    await manager.broadcastEval('process.exit(0)');
    await manager.destroy();
    logger.info('Shard manager shutdown complete');
  } catch (error) {
    logger.error({ err: error }, 'Error during shutdown');
  }

  process.exit(0);
}

// Handle signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ err: reason, promise }, 'Unhandled rejection in shard manager');
});
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught exception in shard manager');
  shutdown();
});

// Start
spawnShards();

export default manager;