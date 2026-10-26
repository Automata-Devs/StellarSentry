/**
 * CSRF Middleware - Cross-Site Request Forgery protection
 * Using csurf-like implementation for Express
 */
import csrf from 'csrf';
import { env } from '../../../config/env.js';

const tokens = new csrf();

/**
 * CSRF protection middleware
 */
export function csrfMiddleware(req, res, next) {
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for API routes (they use token-based auth)
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf;

  // Get secret from session
  const secret = req.session.csrfSecret || tokens.secretSync();

  // Store secret in session for next request
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = secret;
  }

  // Verify token
  if (!token || !tokens.verify(secret, token)) {
    return res.status(403).render('errors/403', {
      title: 'Forbidden',
      message: 'Invalid CSRF token. Please refresh the page and try again.',
    });
  }

  next();
}

/**
 * Generate CSRF token for templates
 */
export function csrfToken(req) {
  const secret = req.session.csrfSecret || tokens.secretSync();
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = secret;
  }
  return tokens.create(secret);
}

/**
 * Middleware to add CSRF token to all responses
 */
export function csrfTokenMiddleware(req, res, next) {
  res.locals.csrfToken = csrfToken(req);
  next();
}

export default { csrfMiddleware, csrfToken, csrfTokenMiddleware };