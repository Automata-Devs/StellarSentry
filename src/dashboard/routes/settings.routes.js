/**
 * Settings Routes - General server settings
 */
import express from 'express';
import { body, validationResult } from 'express-validator';
import { guildService } from '../../services/guild.service.js';
import { getFeaturesSorted, FEATURE_CATEGORIES } from '../../config/features.js';

const router = express.Router();

/**
 * GET /settings/:guildId - General settings page
 */
router.get('/:guildId', async (req, res) => {
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
    console.error('Settings error:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load settings',
    });
  }
});

/**
 * POST /settings/:guildId/features/:feature - Toggle feature
 */
router.post('/:guildId/features/:feature', async (req, res) => {
  try {
    const { guildId, feature } = req.params;
    const { enabled } = req.body;

    await guildService.toggleFeature(guildId, feature, enabled);

    res.json({ success: true, feature, enabled });
  } catch (error) {
    console.error('Toggle feature error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle feature' });
  }
});

/**
 * POST /settings/:guildId - Update general settings
 */
router.post('/:guildId', [
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

    await guildService.updateSettings(guildId, { prefix, language });

    req.flash('success', 'Settings updated successfully');
    res.redirect('back');
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

export default router;