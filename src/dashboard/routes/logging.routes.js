/**
 * Logging Routes - Audit logging management
 */
import express from 'express';
import { AuditLog } from '../../database/models/AuditLog.js';
import { guildService } from '../../services/guild.service.js';
import { logger } from '../../utils/logger.js';
import { guildAccessMiddleware } from '../middleware/guildAccess.js';

const router = express.Router();

/**
 * GET /logging/:guildId - Logging overview
 */
router.get('/:guildId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const logging = settings?.logging || {};

    res.render('pages/logging', {
      title: `${req.guild.name} - Logging - StellarSentry`,
      user: req.user,
      guild: req.guild,
      settings,
      logging,
    });
  } catch (error) {
    logger.error({ err: error }, 'Logging page error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * GET /logging/:guildId/logs - View audit logs with pagination
 */
router.get('/:guildId/logs', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const category = req.query.category;
    const userId = req.query.userId;
    const skip = (page - 1) * limit;

    const query = { guildId };
    if (category) query.eventCategory = category;
    if (userId) query.userId = userId;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Audit logs error');
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /logging/:guildId/settings - Get logging settings
 */
router.get('/:guildId/settings', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const logging = settings?.logging || {};

    res.json({ success: true, data: logging });
  } catch (error) {
    logger.error({ err: error }, 'Logging settings error');
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /logging/:guildId/settings - Update logging settings
 */
router.post('/:guildId/settings', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = req.body;

    await guildService.updateSettings(guildId, { logging: updates });
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Update logging settings error');
    res.status(400).json({ success: false, error: error.message });
  }
});

export const loggingRoutes = router;
export default router;