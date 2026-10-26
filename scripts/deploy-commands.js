/**
 * Deploy Commands Script - Register slash commands with Discord
 * Can be run locally or via CI/CD
 */
import { REST, Routes } from '@discordjs/rest';
import { loadEnv } from '../src/config/env.js';
import { loadCommands } from '../src/loaders/commandLoader.js';
import { loadContextMenus } from '../src/loaders/componentLoader.js';
import { logger } from '../src/utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    // Load environment variables
    loadEnv();

    const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_DEV_GUILD_ID, NODE_ENV } = process.env;

    if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
      logger.error('Missing required environment variables: DISCORD_TOKEN, DISCORD_CLIENT_ID');
      process.exit(1);
    }

    // Load commands
    const commandsPath = join(__dirname, '../src/bot/commands');
    await loadCommands(commandsPath);

    // Load context menus
    const contextMenusPath = join(__dirname, '../src/bot/contextMenus');
    await loadContextMenus(contextMenusPath);

    // Get all commands from the client
    const { client } = await import('../src/core/client.js');
    const commandData = Array.from(client.commands.values()).map(c => c.data.toJSON());

    // Get context menus
    const contextMenuData = Array.from(client.contextMenus.values()).map(c => c.data.toJSON());

    const allCommands = [...commandData, ...contextMenuData];

    if (allCommands.length === 0) {
      logger.warn('No commands found to deploy');
      process.exit(0);
    }

    logger.info({ count: allCommands.length }, 'Deploying commands...');

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    let result;

    if (NODE_ENV === 'production' || !DISCORD_DEV_GUILD_ID) {
      // Global deployment
      logger.info('Deploying global commands...');
      result = await rest.put(
        Routes.applicationCommands(DISCORD_CLIENT_ID),
        { body: allCommands }
      );
      logger.info({ count: result.length }, 'Global commands deployed successfully');
    } else {
      // Guild-specific deployment (faster for development)
      logger.info({ guildId: DISCORD_DEV_GUILD_ID }, 'Deploying guild commands...');
      result = await rest.put(
        Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_DEV_GUILD_ID),
        { body: allCommands }
      );
      logger.info({ count: result.length, guildId: DISCORD_DEV_GUILD_ID }, 'Guild commands deployed successfully');
    }

    // Log deployed commands
    for (const cmd of result) {
      logger.debug({ name: cmd.name, type: cmd.type }, 'Deployed command');
    }

    logger.info('Command deployment completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Failed to deploy commands');
    process.exit(1);
  }
}

main();