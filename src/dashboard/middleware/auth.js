/**
 * Auth Middleware - Require authentication for dashboard routes
 */

/**
 * Require authenticated user
 */
export function authMiddleware(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
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