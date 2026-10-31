/**
 * Auth Middleware - Require authentication for dashboard routes
 */

/**
<<<<<<< HEAD
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
>>>>>>> f652c8f (Initial Commit - 2)
 * Require authenticated user
 */
export function authMiddleware(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
<<<<<<< HEAD
=======
    if (expectsJson(req)) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
>>>>>>> f652c8f (Initial Commit - 2)
    // Store original URL for redirect after login
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }
  next();
}

/**
 * Require admin/owner permissions
 */
export function ownerMiddleware(req, res, next) {
  const ownerIds = process.env.OWNER_IDS?.split(',').map(id => id.trim()) || [];

  if (!ownerIds.includes(req.user.id)) {
<<<<<<< HEAD
=======
    if (expectsJson(req)) {
      return res.status(403).json({ success: false, error: 'Owner permissions required.' });
    }
>>>>>>> f652c8f (Initial Commit - 2)
    return res.status(403).render('errors/403', {
      title: 'Forbidden',
      message: 'This page requires owner permissions.',
    });
  }
  next();
}

/**
 * Optional auth - attach user if available but don't require
 */
export function optionalAuth(req, res, next) {
  // User is already attached by passport if authenticated
  next();
}

export default { authMiddleware, ownerMiddleware, optionalAuth };