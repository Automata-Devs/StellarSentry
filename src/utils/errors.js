/**
 * Custom error classes for the application
 * Provides structured error handling with user-friendly messages
 */

/**
 * Base application error
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code for programmatic handling
   * @param {number} statusCode - HTTP status code
   * @param {Object} details - Additional error details
   */
  constructor(message, code = 'APP_ERROR', statusCode = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * User-facing error - safe to show to users
 */
export class UserError extends AppError {
  constructor(message, code = 'USER_ERROR', details = {}) {
    super(message, code, 400, details);
    this.isUserError = true;
  }
}

/**
 * Permission denied error
 */
export class PermissionError extends AppError {
  constructor(message = 'You do not have permission to perform this action', details = {}) {
    super(message, 'PERMISSION_DENIED', 403, details);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource', details = {}) {
    super(`${resource} not found`, 'NOT_FOUND', 404, details);
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = {}) {
    super(message, 'VALIDATION_ERROR', 422, details);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later', details = {}) {
    super(message, 'RATE_LIMITED', 429, details);
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = {}) {
    super(message, 'DATABASE_ERROR', 500, details);
  }
}

/**
 * Discord API error
 */
export class DiscordError extends AppError {
  constructor(message = 'Discord API error', details = {}) {
    super(message, 'DISCORD_ERROR', 502, details);
  }
}

/**
 * Lavalink error
 */
export class LavalinkError extends AppError {
  constructor(message = 'Lavalink connection error', details = {}) {
    super(message, 'LAVALINK_ERROR', 503, details);
  }
}

/**
 * Configuration error
 */
export class ConfigError extends AppError {
  constructor(message = 'Configuration error', details = {}) {
    super(message, 'CONFIG_ERROR', 500, details);
  }
}

/**
 * Check if an error is an operational (expected) error
 * @param {Error} error
 * @returns {boolean}
 */
export function isOperationalError(error) {
  return error instanceof AppError && error.isOperational;
}

/**
 * Check if an error is a user-facing error
 * @param {Error} error
 * @returns {boolean}
 */
export function isUserError(error) {
  return error instanceof UserError;
}

/**
 * Format error for logging
 * @param {Error} error
 * @returns {Object}
 */
export function formatError(error) {
  return {
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    details: error.details,
    stack: error.stack,
    isOperational: error.isOperational,
  };
}