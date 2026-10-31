/**
 * Logger utility using Pino
 * Pretty printing in development, JSON in production
 */
import pino from 'pino';
import { env } from '../config/env.js';

<<<<<<< HEAD
let logger;
=======
let loggerCache;
>>>>>>> f652c8f (Initial Commit - 2)

/**
 * Create the logger instance
 * @returns {pino.Logger}
 */
export function createLogger() {
<<<<<<< HEAD
  if (logger) return logger;

  const isDev = env.NODE_ENV === 'development';

  logger = pino({
=======
  if (loggerCache) return loggerCache;

  const isDev = env.NODE_ENV === 'development';

  loggerCache = pino({
>>>>>>> f652c8f (Initial Commit - 2)
    level: env.LOG_LEVEL,
    transport: isDev ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    } : undefined,
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service: 'stellarsentry',
    },
  });

<<<<<<< HEAD
  return logger;
=======
  return loggerCache;
>>>>>>> f652c8f (Initial Commit - 2)
}

/**
 * Get the logger instance (creates if not exists)
 * @returns {pino.Logger}
 */
export function getLogger() {
<<<<<<< HEAD
  if (!logger) return createLogger();
  return logger;
=======
  if (!loggerCache) return createLogger();
  return loggerCache;
>>>>>>> f652c8f (Initial Commit - 2)
}

/**
 * Create a child logger with additional context
 * @param {Object} bindings - Additional context bindings
 * @returns {pino.Logger}
 */
export function createChildLogger(bindings) {
  return getLogger().child(bindings);
}

export const logger = new Proxy({}, {
  get(_, prop) {
    return getLogger()[prop];
  },
});

export default logger;