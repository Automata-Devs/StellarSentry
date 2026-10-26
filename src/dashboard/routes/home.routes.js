/**
 * Home Routes - Landing page and public pages
 */
import express from 'express';

const router = express.Router();

/**
 * GET / - Landing page
 */
router.get('/', (req, res) => {
  res.render('pages/index', {
    title: 'StellarSentry - Discord Bot with Dashboard',
    user: req.user,
  });
});

/**
 * GET /features - Features page
 */
router.get('/features', (req, res) => {
  res.render('pages/features', {
    title: 'Features - StellarSentry',
    user: req.user,
  });
});

/**
 * GET /pricing - Pricing page (if applicable)
 */
router.get('/pricing', (req, res) => {
  res.render('pages/pricing', {
    title: 'Pricing - StellarSentry',
    user: req.user,
  });
});

/**
 * GET /docs - Documentation page
 */
router.get('/docs', (req, res) => {
  res.render('pages/docs', {
    title: 'Documentation - StellarSentry',
    user: req.user,
  });
});

/**
 * GET /support - Support page
 */
router.get('/support', (req, res) => {
  res.render('pages/support', {
    title: 'Support - StellarSentry',
    user: req.user,
  });
});

/**
 * GET /invite - Invite bot page
 */
router.get('/invite', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
  res.redirect(inviteUrl);
});

export default router;