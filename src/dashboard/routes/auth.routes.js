/**
 * Auth Routes - Discord OAuth2 authentication
 */
import express from 'express';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { env } from '../../config/env.js';
import { guildService } from '../../services/guild.service.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

// Configure Discord Strategy
passport.use(new DiscordStrategy({
  clientID: env.DISCORD_CLIENT_ID,
  clientSecret: env.DISCORD_CLIENT_SECRET,
  callbackURL: `${env.DASHBOARD_URL}/auth/callback`,
  scope: ['identify', 'guilds'],
}, async (accessToken, refreshToken, profile, done) => {
  // User is authenticated, attach tokens
  profile.accessToken = accessToken;
  profile.refreshToken = refreshToken;
  return done(null, profile);
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

/**
 * GET /auth/login - Initiate Discord OAuth2 login
 */
router.get('/login', (req, res, next) => {
  // Store return URL
  if (req.query.returnTo) {
    req.session.returnTo = req.query.returnTo;
  }
  passport.authenticate('discord')(req, res, next);
});

/**
 * GET /auth/callback - Discord OAuth2 callback
 */
router.get('/callback',
  passport.authenticate('discord', { failureRedirect: '/auth/login' }),
  async (req, res) => {
    try {
      const user = req.user;
      // Fetch user's guilds
      const response = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      const guilds = await response.json();
      user.guilds = guilds;

      // Update session
      req.session.user = user;

      // Redirect to return URL or dashboard
      const returnTo = req.session.returnTo || '/guilds';
      delete req.session.returnTo;

      res.redirect(returnTo);
    } catch (error) {
      logger.error({ err: error }, 'Auth callback error');
      res.redirect('/auth/login');
    }
  }
);

/**
 * GET /auth/logout - Logout
 */
router.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      logger.error({ err }, 'Logout error');
    }
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
};

/**
 * GET /auth/status - Check auth status (for AJAX)
 */
router.get('/status', (req, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user ? {
      id: req.user.id,
      username: req.user.username,
      discriminator: req.user.discriminator,
      avatar: req.user.avatar,
    } : null,
  });
});

export default router;