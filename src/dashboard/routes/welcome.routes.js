/**
<<<<<<< HEAD
 * Welcome Routes - Welcome/Leave settings
=======
 * Welcome Routes - Welcome/Leave system settings
>>>>>>> f652c8f (Initial Commit - 2)
 */
import express from 'express';
import { body, validationResult } from 'express-validator';
import { guildService } from '../../services/guild.service.js';
<<<<<<< HEAD
=======
import { logger } from '../../utils/logger.js';
import { guildAccessMiddleware } from '../middleware/guildAccess.js';
>>>>>>> f652c8f (Initial Commit - 2)

const router = express.Router();

/**
 * GET /welcome/:guildId - Welcome settings
 */
<<<<<<< HEAD
router.get('/:guildId', async (req, res) => {
=======
router.get('/:guildId', guildAccessMiddleware, async (req, res) => {
>>>>>>> f652c8f (Initial Commit - 2)
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const welcome = settings?.welcome || {};
    const leave = settings?.leave || {};

<<<<<<< HEAD
    // Get channels and roles for dropdowns
    const channels = req.guild.channels.cache
      .filter(c => c.isTextBased())
      .map(c => ({ id: c.id, name: c.name }));
=======
    const channels = req.guild.channels.cache
      .filter(c => c.isTextBased())
      .map(c => ({ id: c.id, name: c.name }));

>>>>>>> f652c8f (Initial Commit - 2)
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
<<<<<<< HEAD
    console.error('Welcome error:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load welcome settings',
    });
=======
    logger.error({ err: error }, 'Welcome page error');
    res.status(500).render('errors/500', { title: 'Server Error' });
>>>>>>> f652c8f (Initial Commit - 2)
  }
});

/**
 * POST /welcome/:guildId - Update welcome settings
 */
<<<<<<< HEAD
router.post('/:guildId', [
=======
router.post('/:guildId', guildAccessMiddleware, [
>>>>>>> f652c8f (Initial Commit - 2)
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
<<<<<<< HEAD
      if (['enabled', 'channel', 'message', 'embed.enabled', 'embed.title', 'embed.description', 'embed.color', 'embed.thumbnail', 'embed.image', 'embed.footer', 'autoRoles'].includes(key)) {
=======
      if (['enabled', 'channel', 'message', 'autoRoles'].includes(key)) {
>>>>>>> f652c8f (Initial Commit - 2)
        updates[`welcome.${key}`] = req.body[key];
      }
    });

<<<<<<< HEAD
    await guildService.updateSettings(guildId, updates);
    req.flash('success', 'Welcome settings updated');
    res.redirect('back');
  } catch (error) {
    console.error('Update welcome error:', error);
    res.status(500).json({ success: false, error: 'Failed to update welcome settings' });
=======
    if (req.body['embed.enabled'] !== undefined) {
      updates['welcome.embed.enabled'] = req.body['embed.enabled'];
    }
    if (req.body['embed.title']) {
      updates['welcome.embed.title'] = req.body['embed.title'];
    }
    if (req.body['embed.description']) {
      updates['welcome.embed.description'] = req.body['embed.description'];
    }
    if (req.body['embed.color']) {
      updates['welcome.embed.color'] = req.body['embed.color'];
    }
    if (req.body['embed.thumbnail']) {
      updates['welcome.embed.thumbnail'] = req.body['embed.thumbnail'];
    }
    if (req.body['embed.image']) {
      updates['welcome.embed.image'] = req.body['embed.image'];
    }
    if (req.body['embed.footer']) {
      updates['welcome.embed.footer'] = req.body['embed.footer'];
    }

    await guildService.updateSettings(guildId, updates);

    req.flash('success', 'Welcome settings updated');
    res.redirect('back');
  } catch (error) {
    logger.error({ err: error }, 'Update welcome error');
    res.status(500).json({ success: false, error: error.message });
>>>>>>> f652c8f (Initial Commit - 2)
  }
});

/**
 * POST /welcome/:guildId/leave - Update leave settings
 */
<<<<<<< HEAD
router.post('/:guildId/leave', [
=======
router.post('/:guildId/leave', guildAccessMiddleware, [
>>>>>>> f652c8f (Initial Commit - 2)
  body('enabled').optional().isBoolean(),
  body('channel').optional().isString(),
  body('message').optional().isLength({ max: 2000 }),
], async (req, res) => {
  try {
<<<<<<< HEAD
=======
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

>>>>>>> f652c8f (Initial Commit - 2)
    const { guildId } = req.params;
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (['enabled', 'channel', 'message', 'embed.enabled', 'embed.title', 'embed.description', 'embed.color'].includes(key)) {
        updates[`leave.${key}`] = req.body[key];
      }
    });

    await guildService.updateSettings(guildId, updates);
<<<<<<< HEAD
    req.flash('success', 'Leave settings updated');
    res.redirect('back');
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({ success: false, error: 'Failed to update leave settings' });
  }
});

=======

    req.flash('success', 'Leave settings updated');
    res.redirect('back');
  } catch (error) {
    logger.error({ err: error }, 'Update leave error');
    res.status(500).json({ success: false, error: error.message });
  }
});

export const welcomeRoutes = router;
>>>>>>> f652c8f (Initial Commit - 2)
export default router;