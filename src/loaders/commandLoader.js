/**
 * Command Loader - Auto-loads slash commands from directory structure
 * Supports categories and subdirectories
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { client } from '../core/client.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load all commands from the commands directory
 * @param {string} commandsDir - Path to commands directory
 * @returns {Promise<number>} Number of commands loaded
 */
export async function loadCommands(commandsDir = path.join(__dirname, '../../bot/commands')) {
  let loaded = 0;
  let failed = 0;

  if (!fs.existsSync(commandsDir)) {
    logger.warn({ commandsDir }, 'Commands directory does not exist');
    return 0;
  }

  const categories = fs.readdirSync(commandsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const category of categories) {
    const categoryPath = path.join(commandsDir, category);
    const commandFiles = getCommandFiles(categoryPath);

    for (const file of commandFiles) {
      try {
        const command = await import(file);

        // Handle both default and named exports
        const commandModule = command.default || command;

        if (!commandModule.data || !commandModule.execute) {
          logger.warn({ file, category }, 'Invalid command structure (missing data or execute)');
          failed++;
          continue;
        }

        client.registerCommand(commandModule);
        loaded++;
        logger.debug({ command: commandModule.data.name, category }, 'Command loaded');
      } catch (error) {
        logger.error({ file, category, err: error }, 'Failed to load command');
        failed++;
      }
    }
  }

  logger.info({ loaded, failed, total: loaded + failed }, 'Commands loaded');
  return loaded;
}

/**
 * Recursively get all .js files in directory
 * @param {string} dir
 * @returns {string[]}
 */
function getCommandFiles(dir) {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getCommandFiles(fullPath));
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
      // Convert to file:// URL for ES modules
      files.push(pathToFileURL(fullPath));
    }
  }

  return files;
}

/**
 * Convert file path to file:// URL
 * @param {string} filePath
 * @returns {string}
 */
function pathToFileURL(filePath) {
  const resolved = path.resolve(filePath);
  return `file://${resolved.replace(/\\/g, '/')}`;
}

/**
 * Reload a specific command
 * @param {string} commandName
 * @returns {Promise<boolean>}
 */
export async function reloadCommand(commandName) {
  // Find command file
  const commandsDir = path.join(__dirname, '../../bot/commands');
  const file = findCommandFile(commandsDir, commandName);

  if (!file) {
    logger.warn({ commandName }, 'Command file not found for reload');
    return false;
  }

  try {
    // Clear require cache (not needed for ES modules, but good practice)
    delete require.cache[require.resolve(file)];

    const command = await import(file);
    const commandModule = command.default || command;

    if (!commandModule.data || !commandModule.execute) {
      logger.warn({ commandName }, 'Invalid command structure on reload');
      return false;
    }

    client.registerCommand(commandModule);
    logger.info({ commandName }, 'Command reloaded');
    return true;
  } catch (error) {
    logger.error({ commandName, err: error }, 'Failed to reload command');
    return false;
  }
}

/**
 * Find command file by name
 * @param {string} dir
 * @param {string} commandName
 * @returns {string|null}
 */
function findCommandFile(dir, commandName) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const found = findCommandFile(fullPath, commandName);
      if (found) return found;
    } else if (entry.name === `${commandName}.js`) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Unload a command
 * @param {string} commandName
 * @returns {boolean}
 */
export function unloadCommand(commandName) {
  const command = client.commands.get(commandName);
  if (command) {
    client.commands.delete(commandName);
    logger.info({ commandName }, 'Command unloaded');
    return true;
  }
  return false;
}

export default { loadCommands, reloadCommand, unloadCommand };