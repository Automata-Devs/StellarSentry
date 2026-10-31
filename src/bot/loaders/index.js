/**
 * Bot loaders re-exports
 * Provides compatible import paths for bot commands using `../../loaders/`
 */
export { loadCommands, reloadCommand, unloadCommand } from '../../../loaders/commandLoader.js';
export { loadEvents, reloadEvent } from '../../../loaders/eventLoader.js';
export { loadComponents } from '../../../loaders/componentLoader.js';
export { loadRoutes } from '../../../loaders/routeLoader.js';