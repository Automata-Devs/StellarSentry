/**
 * Event Loader - Auto-loads event handlers from directory structure
 * Supports client, interaction, message, reaction, voice, and guild events
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { client } from '../core/client.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load all events from the events directory
 * @param {string} eventsDir - Path to events directory
 * @returns {Promise<number>} Number of events loaded
 */
export async function loadEvents(eventsDir = path.join(__dirname, '../../bot/events')) {
  let loaded = 0;
  let failed = 0;

  if (!fs.existsSync(eventsDir)) {
    logger.warn({ eventsDir }, 'Events directory does not exist');
    return 0;
  }

  const eventTypes = fs.readdirSync(eventsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const eventType of eventTypes) {
    const typePath = path.join(eventsDir, eventType);
    const eventFiles = getEventFiles(typePath);

    for (const file of eventFiles) {
      try {
        const eventModule = await import(file);
        const event = eventModule.default || eventModule;

        if (!event.name || !event.execute) {
          logger.warn({ file, eventType }, 'Invalid event structure (missing name or execute)');
          failed++;
          continue;
        }

        // Register event based on type
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }

        loaded++;
        logger.debug({ event: event.name, type: eventType }, 'Event loaded');
      } catch (error) {
        logger.error({ file, eventType, err: error }, 'Failed to load event');
        failed++;
      }
    }
  }

  logger.info({ loaded, failed, total: loaded + failed }, 'Events loaded');
  return loaded;
}

/**
 * Recursively get all .js files in directory
 * @param {string} dir
 * @returns {string[]}
 */
function getEventFiles(dir) {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getEventFiles(fullPath));
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
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
 * Reload a specific event
 * @param {string} eventName
 * @returns {Promise<boolean>}
 */
export async function reloadEvent(eventName) {
  const eventsDir = path.join(__dirname, '../../bot/events');
  const file = findEventFile(eventsDir, eventName);

  if (!file) {
    logger.warn({ eventName }, 'Event file not found for reload');
    return false;
  }

  try {
    const eventModule = await import(file);
    const event = eventModule.default || eventModule;

    if (!event.name || !event.execute) {
      logger.warn({ eventName }, 'Invalid event structure on reload');
      return false;
    }

    // Remove old listener
    client.off(event.name);

    // Add new listener
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }

    logger.info({ eventName }, 'Event reloaded');
    return true;
  } catch (error) {
    logger.error({ eventName, err: error }, 'Failed to reload event');
    return false;
  }
}

/**
 * Find event file by name
 * @param {string} dir
 * @param {string} eventName
 * @returns {string|null}
 */
function findEventFile(dir, eventName) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const found = findEventFile(fullPath, eventName);
      if (found) return found;
    } else if (entry.name === `${eventName}.js`) {
      return fullPath;
    }
  }
  return null;
}

export default { loadEvents, reloadEvent };