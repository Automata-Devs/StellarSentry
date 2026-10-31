/**
 * Commands Routes - Command management
 */
import express from 'express';
import { guildService } from '../../services/guild.service.js';
import { client } from '../../core/client.js';
import { logger } from '../../utils/logger.js';
import { guildAccessMiddleware } from '../middleware/guildAccess.js';

const router = express.Router();

/**
 * GET /commands/:guildId - Command management
 */
router.get('/:guildId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const commands = Array.from(client.commands.values());

    // Get disabled commands for this guild
    const disabledCommands = settings?.commands?.disabledCommands || [];
    const disabledCategories = settings?.commands?.disabledCategories || [];

    const commandsWithStatus = commands.map(cmd => ({
      name: cmd.data.name,
      description: cmd.data.description,
      category: cmd.category,
      enabled: !disabledCommands.includes(cmd.data.name) && !disabledCategories.includes(cmd.category),
    }));

    res.render('pages/commands', {
      title: `${req.guild.name} - Commands - StellarSentry`,
      user: req.user,
      guild: req.guild,
      settings,
      commands: commandsWithStatus,
    });
  } catch (error) {
    logger.error({ err: error }, 'Commands page error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * POST /commands/:guildId/toggle - Toggle command
 */
router.post('/:guildId/toggle', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { command, enabled } = req.body;

    const settings = await guildService.getGuild(guildId);
    const disabledCommands = settings?.commands?.disabledCommands || [];

    if (enabled) {
      await guildService.pullFromArraySetting(guildId, 'commands.disabledCommands', command);
    } else {
      await guildService.pushToArraySetting(guildId, 'commands.disabledCommands', command);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Toggle command error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /commands/:guildId/category/toggle - Toggle category
 */
router.post('/:guildId/category/toggle', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { category, enabled } = req.body;

    const settings = await guildService.getGuild(guildId);
    const disabledCategories = settings?.commands?.disabledCategories || [];

    if (enabled) {
      await guildService.pullFromArraySetting(guildId, 'commands.disabledCategories', category);
    } else {
      await guildService.pushToArraySetting(guildId, 'commands.disabledCategories', category);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Toggle category error');
    res.status(400).json({ success: false, error: error.message });
  }
});

export const commandsRoutes = router;
export default router;