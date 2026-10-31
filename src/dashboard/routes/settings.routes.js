/**
 * Settings Routes - General server settings
 */
import express from 'express';
import { body, validationResult } from 'express-validator';
import { guildService } from '../../services/guild.service.js';
import { getFeaturesSorted, FEATURE_CATEGORIES } from '../../config/features.js';
import { logger } from '../../utils/logger.js';
import { guildAccessMiddleware } from '../middleware/guildAccess.js';

const router = express.Router();

/**
 * GET /settings/:guildId - General settings
 */
router.get('/:guildId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);

    const features = getFeaturesSorted().map(feat => ({
      ...feat,
      enabled: settings?.features?.[feat.key] === true,
    }));

    res.render('pages/settings', {
      title: `${req.guild.name} - Settings - StellarSentry`,
      user: req.user,
      guild: req.guild,
      settings,
      features,
      categories: FEATURE_CATEGORIES,
    });
  } catch (error) {
    logger.error({ err: error }, 'Settings page error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * POST /settings/:guildId - Update general settings
 */
router.post('/:guildId', guildAccessMiddleware, [
  body('prefix').optional().isLength({ min: 1, max: 5 }),
  body('language').optional().isLength({ min: 2, max: 5 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { guildId } = req.params;
    const { prefix, language } = req.body;

    // Ensure guild exists in database
    await guildService.getOrCreateGuild(guildId);
    await guildService.updateSettings(guildId, { prefix, language });

    req.flash('success', 'Settings updated successfully');
    res.redirect('back');
  } catch (error) {
    logger.error({ err: error }, 'Update settings error');
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /settings/:guildId/features/:feature - Toggle feature
 */
router.post('/:guildId/features/:feature', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, feature } = req.params;
    const { enabled } = req.body;

    // Ensure guild exists in database
    await guildService.getOrCreateGuild(guildId);
    await guildService.toggleFeature(guildId, feature, enabled);

    res.json({ success: true, feature, enabled });
  } catch (error) {
    logger.error({ err: error }, 'Toggle feature error');
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /settings/:guildId/commands - Toggle command
 */
router.post('/:guildId/commands', guildAccessMiddleware, [
  body('command').isString().notEmpty(),
  body('enabled').isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { guildId } = req.params;
    const { command, enabled } = req.body;

    // Ensure guild exists in database
    await guildService.getOrCreateGuild(guildId);
    await guildService.updateSettings(guildId, {
      [`commands.disabledCommands`]: enabled
        ? { $pull: { disabledCommands: command } }
        : { $addToSet: { disabledCommands: command } },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Toggle command error');
    res.status(500).json({ success: false, error: error.message });
  }
});

export const settingsRoutes = router;
export default router;