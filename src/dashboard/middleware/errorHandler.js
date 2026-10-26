/**
 * Error Handler Middleware - Centralized error handling for Express
 */
import { logger } from '../../../utils/logger.js';
import { env } from '../../../config/env.js';

/**
 * Global error handler
 */
export function errorHandlerMiddleware(err, req, res, next) {
  // Log error
  logger.error({
    err: err,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    user: req.user?.id,
  }, 'Dashboard error');

  // Default error response
  const status = err.status || err.statusCode || 500;
  const message = env.NODE_ENV === 'production'
    ? 'An internal server error occurred.'
    : err.message;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).render('errors/400', {
      title: 'Validation Error',
      message: err.message,
    });
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).render('errors/401', {
      title: 'Unauthorized',
      message: 'Please log in to access this page.',
    });
  }

  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('errors/403', {
      title: 'Forbidden',
      message: 'Invalid CSRF token. Please refresh and try again.',
    });
  }

  // Render error page
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(status).json({
      success: false,
      error: message,
    });
  }

  res.status(status).render(`errors/${status >= 500 ? '500' : status}`, {
    title: status >= 500 ? 'Server Error' : 'Error',
    message,
    error: env.NODE_ENV === 'production' ? {} : err,
  });
}

/**
 * Not found handler (404)
 */
export function notFoundHandler(req, res) {
  res.status(404).render('errors/404', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
  });
}

/**
 * Async wrapper for route handlers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default { errorHandlerMiddleware, notFoundHandler, asyncHandler };