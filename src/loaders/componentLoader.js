/**
 * Component Loader - Auto-loads buttons, select menus, and modals
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
 * Load all components from the components directory
 * @param {string} componentsDir - Path to components directory
 * @returns {Promise<Object>} Loaded counts
 */
export async function loadComponents(componentsDir = path.join(__dirname, '../../bot/components')) {
  const results = { buttons: 0, selectMenus: 0, modals: 0, failed: 0 };

  if (!fs.existsSync(componentsDir)) {
    logger.warn({ componentsDir }, 'Components directory does not exist');
    return results;
  }

  // Load buttons
  const buttonsDir = path.join(componentsDir, 'buttons');
  if (fs.existsSync(buttonsDir)) {
    const buttonFiles = getComponentFiles(buttonsDir);
    for (const file of buttonFiles) {
      try {
        const component = await import(file);
        const button = component.default || component;

        if (!button.customId || !button.execute) {
          logger.warn({ file }, 'Invalid button structure (missing customId or execute)');
          results.failed++;
          continue;
        }

        client.registerButton(button.customId, button.execute);
        results.buttons++;
        logger.debug({ button: button.customId }, 'Button loaded');
      } catch (error) {
        logger.error({ file, err: error }, 'Failed to load button');
        results.failed++;
      }
    }
  }

  // Load select menus
  const selectMenusDir = path.join(componentsDir, 'selectMenus');
  if (fs.existsSync(selectMenusDir)) {
    const selectFiles = getComponentFiles(selectMenusDir);
    for (const file of selectFiles) {
      try {
        const component = await import(file);
        const selectMenu = component.default || component;

        if (!selectMenu.customId || !selectMenu.execute) {
          logger.warn({ file }, 'Invalid select menu structure (missing customId or execute)');
          results.failed++;
          continue;
        }

        client.registerSelectMenu(selectMenu.customId, selectMenu.execute);
        results.selectMenus++;
        logger.debug({ selectMenu: selectMenu.customId }, 'Select menu loaded');
      } catch (error) {
        logger.error({ file, err: error }, 'Failed to load select menu');
        results.failed++;
      }
    }
  }

  // Load modals
  const modalsDir = path.join(componentsDir, 'modals');
  if (fs.existsSync(modalsDir)) {
    const modalFiles = getComponentFiles(modalsDir);
    for (const file of modalFiles) {
      try {
        const component = await import(file);
        const modal = component.default || component;

        if (!modal.customId || !modal.execute) {
          logger.warn({ file }, 'Invalid modal structure (missing customId or execute)');
          results.failed++;
          continue;
        }

        client.registerModal(modal.customId, modal.execute);
        results.modals++;
        logger.debug({ modal: modal.customId }, 'Modal loaded');
      } catch (error) {
        logger.error({ file, err: error }, 'Failed to load modal');
        results.failed++;
      }
    }
  }

  logger.info({ ...results, total: results.buttons + results.selectMenus + results.modals }, 'Components loaded');
  return results;
}

/**
 * Get all .js files in directory recursively
 * @param {string} dir
 * @returns {string[]}
 */
function getComponentFiles(dir) {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getComponentFiles(fullPath));
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

export default { loadComponents };