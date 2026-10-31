/**
 * Moderation Routes - Moderation settings and logs
 */
import express from 'express';
import { body, validationResult } from 'express-validator';
import { guildService } from '../../services/guild.service.js';
import { AuditLog } from '../../database/models/AuditLog.js';
<<<<<<< HEAD
=======
import { guildAccessMiddleware } from '../middleware/guildAccess.js';
>>>>>>> f652c8f (Initial Commit - 2)

const router = express.Router();

/**
 * GET /moderation/:guildId - Moderation settings and logs
 */
<<<<<<< HEAD
router.get('/:guildId', async (req, res) => {
=======
router.get('/:guildId', guildAccessMiddleware, async (req, res) => {
>>>>>>> f652c8f (Initial Commit - 2)
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const moderation = settings?.moderation || {};

    // Get recent moderation logs
    const logs = await AuditLog.find({ guildId, eventCategory: 'moderation' })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.render('pages/moderation', {
      title: `${req.guild.name} - Moderation - StellarSentry`,
      user: req.user,
      guild: req.guild,
      settings,
      moderation,
      logs,
    });
  } catch (error) {
    console.error('Moderation error:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load moderation',
    });
  }
});

/**
 * POST /moderation/:guildId - Update moderation settings
 */
<<<<<<< HEAD
router.post('/:guildId', [
=======
router.post('/:guildId', guildAccessMiddleware, [
>>>>>>> f652c8f (Initial Commit - 2)
  body('logChannel').optional().isString(),
  body('modRole').optional().isString(),
  body('muteRole').optional().isString(),
  body('dmOnAction').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { guildId } = req.params;
    const { logChannel, modRole, muteRole, dmOnAction } = req.body;

    const updates = {};
    if (logChannel !== undefined) updates['moderation.logChannel'] = logChannel || null;
    if (modRole !== undefined) updates['moderation.modRole'] = modRole || null;
    if (muteRole !== undefined) updates['moderation.muteRole'] = muteRole || null;
    if (dmOnAction !== undefined) updates['moderation.dmOnAction'] = dmOnAction;

    await guildService.updateSettings(guildId, updates);

    req.flash('success', 'Moderation settings updated');
    res.redirect('back');
  } catch (error) {
    console.error('Update moderation error:', error);
    res.status(500).json({ success: false, error: 'Failed to update moderation settings' });
  }
});

/**
 * GET /moderation/:guildId/logs - View moderation logs with pagination
 */
<<<<<<< HEAD
router.get('/:guildId/logs', async (req, res) => {
=======
router.get('/:guildId/logs', guildAccessMiddleware, async (req, res) => {
>>>>>>> f652c8f (Initial Commit - 2)
  try {
    const { guildId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find({ guildId, eventCategory: 'moderation' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments({ guildId, eventCategory: 'moderation' }),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Moderation logs error:', error);
    res.status(500).json({ error: 'Failed to load logs' });
  }
});

<<<<<<< HEAD
=======
export const moderationRoutes = router;
>>>>>>> f652c8f (Initial Commit - 2)
export default router;