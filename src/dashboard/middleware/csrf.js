/**
 * CSRF Middleware - Cross-Site Request Forgery protection
 * Using csurf-like implementation for Express
 */
import csrf from 'csrf';
<<<<<<< HEAD
import { env } from '../../../config/env.js';
=======
import { env } from '../../config/env.js';
>>>>>>> f652c8f (Initial Commit - 2)

const tokens = new csrf();

/**
<<<<<<< HEAD
 * CSRF protection middleware
 */
export function csrfMiddleware(req, res, next) {
=======
 * Check if request expects JSON response
 */
function expectsJson(req) {
  return req.xhr
    || req.headers.accept?.includes('application/json')
    || req.headers['content-type']?.includes('application/json')
    || req.path.startsWith('/api/');
}

/**
 * CSRF protection middleware
 */
export function csrfMiddleware(req, res, next) {
  // Add csrfToken function to request for use in templates
  req.csrfToken = () => csrfToken(req);

>>>>>>> f652c8f (Initial Commit - 2)
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
<<<<<<< HEAD
=======
    if (expectsJson(req)) {
      return res.status(403).json({ success: false, error: 'Invalid CSRF token. Please refresh the page and try again.' });
    }
>>>>>>> f652c8f (Initial Commit - 2)
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