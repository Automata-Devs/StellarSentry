/**
 * Route Loader - Auto-loads Express routes from directory structure
 * Supports route groups and middleware
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load all routes from the routes directory
 * @param {Express.Application} app - Express app instance
 * @param {string} routesDir - Path to routes directory
 * @returns {Promise<number>} Number of routes loaded
 */
export async function loadRoutes(app, routesDir = path.join(__dirname, '../../dashboard/routes')) {
  let loaded = 0;
  let failed = 0;

  if (!fs.existsSync(routesDir)) {
    logger.warn({ routesDir }, 'Routes directory does not exist');
    return 0;
  }

  // Load route files in order (auth first, then others)
  const routeOrder = [
    'auth.routes.js',
    'health.routes.js',
    'home.routes.js',
    'guilds.routes.js',
    'overview.routes.js',
    'settings.routes.js',
    'moderation.routes.js',
    'welcome.routes.js',
    'leveling.routes.js',
    'economy.routes.js',
    'tickets.routes.js',
    'giveaways.routes.js',
    'suggestions.routes.js',
    'starboard.routes.js',
    'music.routes.js',
    'reactionRoles.routes.js',
    'commands.routes.js',
    'logging.routes.js',
  ];

  for (const routeFile of routeOrder) {
    const filePath = path.join(routesDir, routeFile);
    if (fs.existsSync(filePath)) {
      try {
        const routeModule = await import(pathToFileURL(filePath));
        const router = routeModule.default || routeModule;

        if (router && typeof router === 'function') {
          // Router is a function that registers routes
          router(app);
        } else if (router && router.stack) {
          // Router is an Express Router instance
          const basePath = getBasePath(routeFile);
          app.use(basePath, router);
        }

        loaded++;
        logger.debug({ route: routeFile }, 'Route loaded');
      } catch (error) {
        logger.error({ route: routeFile, err: error }, 'Failed to load route');
        failed++;
      }
    }
  }

  // Load API routes
  const apiDir = path.join(routesDir, 'api');
  if (fs.existsSync(apiDir)) {
    const apiFiles = getRouteFiles(apiDir);
    for (const file of apiFiles) {
      try {
        const routeModule = await import(file);
        const router = routeModule.default || routeModule;

        if (router && typeof router === 'function') {
          router(app);
        } else if (router && router.stack) {
          const basePath = getBasePath(path.relative(apiDir, file));
          app.use(`/api/v1${basePath}`, router);
        }

        loaded++;
        logger.debug({ api: path.relative(apiDir, file) }, 'API route loaded');
      } catch (error) {
        logger.error({ api: path.relative(apiDir, file), err: error }, 'Failed to load API route');
        failed++;
      }
    }
  }

  logger.info({ loaded, failed, total: loaded + failed }, 'Routes loaded');
  return loaded;
}

/**
 * Get all .js files in directory recursively
 * @param {string} dir
 * @returns {string[]}
 */
function getRouteFiles(dir) {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getRouteFiles(fullPath));
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
      files.push(pathToFileURL(fullPath));
    }
  }

  return files;
}

/**
 * Get base path from route file name
 * @param {string} routeFile
 * @returns {string}
 */
function getBasePath(routeFile) {
  // Remove .routes.js or .js suffix
  const name = routeFile.replace(/\.routes?\.js$/, '').replace(/\.js$/, '');

  // Special cases
  const pathMap = {
    'auth': '/auth',
    'health': '/health',
    'home': '/',
    'guilds': '/guilds',
    'overview': '/overview',
    'settings': '/settings',
    'moderation': '/moderation',
    'welcome': '/welcome',
    'leveling': '/leveling',
    'economy': '/economy',
    'tickets': '/tickets',
    'giveaways': '/giveaways',
    'suggestions': '/suggestions',
    'starboard': '/starboard',
    'music': '/music',
    'reactionRoles': '/reaction-roles',
    'commands': '/commands',
    'logging': '/logging',
  };

  return pathMap[name] || `/${name}`;
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

export default { loadRoutes };