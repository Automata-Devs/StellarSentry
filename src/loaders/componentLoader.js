/**
 * Component Loader - Auto-loads buttons, select menus, and modals
 * Supports categories and subdirectories
<<<<<<< HEAD
=======
 * Supports two patterns:
 * 1. Single component export: { customId, execute }
 * 2. Registration function export: registerXxx(client) - any function starting with "register"
>>>>>>> f652c8f (Initial Commit - 2)
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
<<<<<<< HEAD
export async function loadComponents(componentsDir = path.join(__dirname, '../../bot/components')) {
=======
export async function loadComponents(componentsDir = path.join(__dirname, '../../src/bot/components')) {
>>>>>>> f652c8f (Initial Commit - 2)
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
<<<<<<< HEAD
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
=======
        const module = await import(file);

        // Pattern 1: Registration function (any function starting with "register")
        const registerFn = Object.values(module).find(fn => typeof fn === 'function' && fn.name?.startsWith('register'));
        if (registerFn) {
          registerFn(client);
          results.buttons++;
          logger.debug({ file, fn: registerFn.name }, 'Button handlers registered');
          continue;
        }

        // Pattern 2: Single component export
        const button = module.default || module;
        if (button.customId && button.execute) {
          client.registerButton(button.customId, button.execute);
          results.buttons++;
          logger.debug({ button: button.customId }, 'Button loaded');
          continue;
        }

        // Pattern 3: Multiple named exports with customId and execute
        let loaded = 0;
        for (const [key, value] of Object.entries(module)) {
          if (value && typeof value === 'object' && value.customId && value.execute) {
            client.registerButton(value.customId, value.execute);
            loaded++;
          }
        }
        if (loaded > 0) {
          results.buttons += loaded;
          logger.debug({ file, loaded }, 'Button components loaded from named exports');
          continue;
        }

        logger.warn({ file }, 'Invalid button structure (missing customId/execute or register function)');
        results.failed++;
>>>>>>> f652c8f (Initial Commit - 2)
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
<<<<<<< HEAD
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
=======
        const module = await import(file);

        // Pattern 1: Registration function (any function starting with "register")
        const registerFn = Object.values(module).find(fn => typeof fn === 'function' && fn.name?.startsWith('register'));
        if (registerFn) {
          registerFn(client);
          results.selectMenus++;
          logger.debug({ file, fn: registerFn.name }, 'Select menu handlers registered');
          continue;
        }

        // Pattern 2: Single component export
        const selectMenu = module.default || module;
        if (selectMenu.customId && selectMenu.execute) {
          client.registerSelectMenu(selectMenu.customId, selectMenu.execute);
          results.selectMenus++;
          logger.debug({ selectMenu: selectMenu.customId }, 'Select menu loaded');
          continue;
        }

        // Pattern 3: Multiple named exports with customId and execute
        let loaded = 0;
        for (const [key, value] of Object.entries(module)) {
          if (value && typeof value === 'object' && value.customId && value.execute) {
            client.registerSelectMenu(value.customId, value.execute);
            loaded++;
          }
        }
        if (loaded > 0) {
          results.selectMenus += loaded;
          logger.debug({ file, loaded }, 'Select menu components loaded from named exports');
          continue;
        }

        logger.warn({ file }, 'Invalid select menu structure (missing customId/execute or register function)');
        results.failed++;
>>>>>>> f652c8f (Initial Commit - 2)
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
<<<<<<< HEAD
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
=======
        const module = await import(file);

        // Pattern 1: Registration function (any function starting with "register")
        const registerFn = Object.values(module).find(fn => typeof fn === 'function' && fn.name?.startsWith('register'));
        if (registerFn) {
          registerFn(client);
          results.modals++;
          logger.debug({ file, fn: registerFn.name }, 'Modal handlers registered');
          continue;
        }

        // Pattern 2: Single component export
        const modal = module.default || module;
        if (modal.customId && modal.execute) {
          client.registerModal(modal.customId, modal.execute);
          results.modals++;
          logger.debug({ modal: modal.customId }, 'Modal loaded');
          continue;
        }

        // Pattern 3: Multiple named exports with customId and execute
        let loaded = 0;
        for (const [key, value] of Object.entries(module)) {
          if (value && typeof value === 'object' && value.customId && value.execute) {
            client.registerModal(value.customId, value.execute);
            loaded++;
          }
        }
        if (loaded > 0) {
          results.modals += loaded;
          logger.debug({ file, loaded }, 'Modal components loaded from named exports');
          continue;
        }

        // Pattern 4: Modal builder functions (createXModal) - these don't need registration
        // They are used by commands to show modals, not to handle submissions
        const hasModalBuilders = Object.values(module).some(fn =>
          typeof fn === 'function' && fn.name?.startsWith('create') && fn.name?.endsWith('Modal')
        );
        if (hasModalBuilders) {
          logger.debug({ file }, 'Modal builder functions found (no registration needed)');
          continue;
        }

        logger.warn({ file }, 'Invalid modal structure (missing customId/execute, register function, or create*Modal functions)');
        results.failed++;
>>>>>>> f652c8f (Initial Commit - 2)
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