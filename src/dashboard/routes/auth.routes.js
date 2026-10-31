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
<<<<<<< HEAD
      // Fetch user's guilds
      const response = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      const guilds = await response.json();
=======
      logger.debug({ userId: user?.id }, 'Auth callback - user authenticated');

      if (!user?.accessToken) {
        logger.error('Auth callback - no access token on user');
        return res.redirect('/auth/login');
      }

      // Fetch user's guilds
      logger.debug('Auth callback - fetching guilds from Discord API');
      const response = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });

      if (!response.ok) {
        logger.error({ status: response.status, statusText: response.statusText }, 'Discord API guilds fetch failed');
        return res.redirect('/auth/login');
      }

      const guilds = await response.json();
      logger.debug({ guildCount: guilds?.length }, 'Auth callback - guilds fetched');

>>>>>>> f652c8f (Initial Commit - 2)
      user.guilds = guilds;

      // Update session
      req.session.user = user;

<<<<<<< HEAD
=======
      // Save session explicitly
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      logger.debug('Auth callback - session saved');

>>>>>>> f652c8f (Initial Commit - 2)
      // Redirect to return URL or dashboard
      const returnTo = req.session.returnTo || '/guilds';
      delete req.session.returnTo;

<<<<<<< HEAD
      res.redirect(returnTo);
    } catch (error) {
      logger.error({ err: error }, 'Auth callback error');
=======
      logger.debug({ returnTo }, 'Auth callback - redirecting');
      res.redirect(returnTo);
    } catch (error) {
      logger.error({ err: error, stack: error?.stack }, 'Auth callback error');
>>>>>>> f652c8f (Initial Commit - 2)
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
<<<<<<< HEAD
};
=======
});
>>>>>>> f652c8f (Initial Commit - 2)

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

<<<<<<< HEAD
=======
export const authRoutes = router;
>>>>>>> f652c8f (Initial Commit - 2)
export default router;