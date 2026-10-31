/**
 * Starboard Routes - Starboard management
 */
import express from 'express';
import { StarboardEntry } from '../../database/models/StarboardEntry.js';
import { guildService } from '../../services/guild.service.js';
import { logger } from '../../utils/logger.js';
import { guildAccessMiddleware } from '../middleware/guildAccess.js';

const router = express.Router();

/**
 * GET /starboard/:guildId - Starboard overview
 */
router.get('/:guildId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const starboard = settings?.starboard || {};

    // Get top starred messages
    const topStarred = await StarboardEntry.getTopStarred(guildId, 10);
    const recent = await StarboardEntry.getRecent(guildId, 20);

    res.render('pages/starboard', {
      title: `${req.guild.name} - Starboard - StellarSentry`,
      user: req.user,
      guild: req.guild,
      settings,
      starboard,
      topStarred,
      recent,
    });
  } catch (error) {
    logger.error({ err: error }, 'Starboard page error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * GET /starboard/:guildId/top - Top starred messages
 */
router.get('/:guildId/top', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const entries = await StarboardEntry.getTopStarred(guildId, limit);

    res.json({ success: true, data: entries });
  } catch (error) {
    logger.error({ err: error }, 'Top starred error');
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /starboard/:guildId/settings - Update starboard settings
 */
router.post('/:guildId/settings', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = req.body;

    await guildService.updateSettings(guildId, { starboard: updates });
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Update starboard settings error');
    res.status(400).json({ success: false, error: error.message });
  }
});

export const starboardRoutes = router;
export default router;