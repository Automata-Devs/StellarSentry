/**
 * Welcome Routes - Welcome/Leave settings
 */
import express from 'express';
import { body, validationResult } from 'express-validator';
import { guildService } from '../../services/guild.service.js';

const router = express.Router();

/**
 * GET /welcome/:guildId - Welcome settings
 */
router.get('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const welcome = settings?.welcome || {};
    const leave = settings?.leave || {};

    // Get channels and roles for dropdowns
    const channels = req.guild.channels.cache
      .filter(c => c.isTextBased())
      .map(c => ({ id: c.id, name: c.name }));
    const roles = req.guild.roles.cache
      .filter(r => r.id !== req.guild.id)
      .map(r => ({ id: r.id, name: r.name }));

    res.render('pages/welcome', {
      title: `${req.guild.name} - Welcome - StellarSentry`,
      user: req.user,
      guild: req.guild,
      settings,
      welcome,
      leave,
      channels,
      roles,
    });
  } catch (error) {
    console.error('Welcome error:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load welcome settings',
    });
  }
});

/**
 * POST /welcome/:guildId - Update welcome settings
 */
router.post('/:guildId', [
  body('enabled').optional().isBoolean(),
  body('channel').optional().isString(),
  body('message').optional().isLength({ max: 2000 }),
  body('autoRoles').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { guildId } = req.params;
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (['enabled', 'channel', 'message', 'embed.enabled', 'embed.title', 'embed.description', 'embed.color', 'embed.thumbnail', 'embed.image', 'embed.footer', 'autoRoles'].includes(key)) {
        updates[`welcome.${key}`] = req.body[key];
      }
    });

    await guildService.updateSettings(guildId, updates);
    req.flash('success', 'Welcome settings updated');
    res.redirect('back');
  } catch (error) {
    console.error('Update welcome error:', error);
    res.status(500).json({ success: false, error: 'Failed to update welcome settings' });
  }
});

/**
 * POST /welcome/:guildId/leave - Update leave settings
 */
router.post('/:guildId/leave', [
  body('enabled').optional().isBoolean(),
  body('channel').optional().isString(),
  body('message').optional().isLength({ max: 2000 }),
], async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (['enabled', 'channel', 'message', 'embed.enabled', 'embed.title', 'embed.description', 'embed.color'].includes(key)) {
        updates[`leave.${key}`] = req.body[key];
      }
    });

    await guildService.updateSettings(guildId, updates);
    req.flash('success', 'Leave settings updated');
    res.redirect('back');
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({ success: false, error: 'Failed to update leave settings' });
  }
});

export default router;