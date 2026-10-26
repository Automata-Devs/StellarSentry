/**
 * Rate Limit Middleware - Express rate limiting
 */
import rateLimit from 'express-rate-limit';
import { env } from '../../../config/env.js';

/**
 * General rate limiter
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for auth routes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many login attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * API rate limiter
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per minute
  message: {
    error: 'Too many API requests, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Create custom rate limiter
 */
export function createRateLimiter(options = {}) {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || { error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    skip: options.skip || (() => false),
  });
}

export default { rateLimitMiddleware, authRateLimiter, apiRateLimiter, createRateLimiter };