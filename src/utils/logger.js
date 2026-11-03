/**
 * Logger utility using Pino
 * Pretty printing in development, JSON in production
 */
import pino from 'pino';
import { env } from '../config/env.js';

let loggerInstance;

/**
 * Create the logger instance
 * @returns {pino.Logger}
 */
export function createLogger() {
  if (loggerInstance) return loggerInstance;

  const isDev = env.NODE_ENV === 'development';

  loggerInstance = pino({
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

  return loggerInstance;
}

/**
 * Get the logger instance (creates if not exists)
 * @returns {pino.Logger}
 */
export function getLogger() {
  if (!loggerInstance) return createLogger();
  return loggerInstance;
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
