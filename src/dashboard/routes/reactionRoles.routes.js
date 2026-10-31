/**
 * Reaction Roles Routes - Reaction roles management
 */
import express from 'express';
import { guildService } from '../../services/guild.service.js';
import { logger } from '../../utils/logger.js';
import { guildAccessMiddleware } from '../middleware/guildAccess.js';

const router = express.Router();

/**
 * GET /reaction-roles/:guildId - Reaction roles overview
 */
router.get('/:guildId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const reactionRoles = settings?.reactionRoles?.panels || [];

    res.render('pages/reactionRoles', {
      title: `${req.guild.name} - Reaction Roles - StellarSentry`,
      user: req.user,
      guild: req.guild,
      settings,
      reactionRoles,
    });
  } catch (error) {
    logger.error({ err: error }, 'Reaction roles page error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * POST /reaction-roles/:guildId/panels - Create reaction role panel
 */
router.post('/:guildId/panels', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channel, title, description, roles } = req.body;

    await guildService.pushToArraySetting(guildId, 'reactionRoles.panels', {
      channel,
      messageId: null,
      title,
      description,
      roles,
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Create reaction role panel error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * PUT /reaction-roles/:guildId/panels/:panelIndex - Update reaction role panel
 */
router.put('/:guildId/panels/:panelIndex', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, panelIndex } = req.params;
    const updates = req.body;

    const settings = await guildService.getGuild(guildId);
    const panels = settings?.reactionRoles?.panels || [];
    const index = parseInt(panelIndex);

    if (index < 0 || index >= panels.length) {
      return res.status(404).json({ success: false, error: 'Panel not found' });
    }

    panels[index] = { ...panels[index], ...updates };
    await guildService.updateSettings(guildId, { 'reactionRoles.panels': panels });

    res.json({ success: true, panel: panels[index] });
  } catch (error) {
    logger.error({ err: error }, 'Update reaction role panel error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /reaction-roles/:guildId/panels/:panelIndex - Delete reaction role panel
 */
router.delete('/:guildId/panels/:panelIndex', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, panelIndex } = req.params;
    const index = parseInt(panelIndex);

    const settings = await guildService.getGuild(guildId);
    const panels = settings?.reactionRoles?.panels || [];

    if (index < 0 || index >= panels.length) {
      return res.status(404).json({ success: false, error: 'Panel not found' });
    }

    panels.splice(index, 1);
    await guildService.updateSettings(guildId, { 'reactionRoles.panels': panels });

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Delete reaction role panel error');
    res.status(400).json({ success: false, error: error.message });
  }
});

export const reactionRolesRoutes = router;
export default router;