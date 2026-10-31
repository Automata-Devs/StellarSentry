/**
 * Giveaways Routes - Giveaway management
 */
import express from 'express';
import { giveawayService } from '../../services/giveaway.service.js';
import { guildService } from '../../services/guild.service.js';
import { logger } from '../../utils/logger.js';
import { guildAccessMiddleware } from '../middleware/guildAccess.js';

const router = express.Router();

/**
 * GET /giveaways/:guildId - Giveaways overview
 */
router.get('/:guildId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const giveaways = await giveawayService.getGuildGiveaways(guildId);

    res.render('pages/giveaways', {
      title: `${req.guild.name} - Giveaways - StellarSentry`,
      user: req.user,
      guild: req.guild,
      settings,
      giveaways,
    });
  } catch (error) {
    logger.error({ err: error }, 'Giveaways page error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * GET /giveaways/:guildId/:giveawayId - Giveaway details
 */
router.get('/:guildId/:giveawayId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, giveawayId } = req.params;
    const giveaway = await giveawayService.getGiveaway(guildId, giveawayId);

    if (!giveaway) {
      return res.status(404).render('errors/404', { title: 'Giveaway Not Found' });
    }

    res.render('pages/giveaways/detail', {
      title: `Giveaway - ${giveaway.prize}`,
      user: req.user,
      guild: req.guild,
      giveaway,
    });
  } catch (error) {
    logger.error({ err: error }, 'Giveaway detail error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * POST /giveaways/:guildId/create - Create giveaway
 */
router.post('/:guildId/create', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { prize, winners, duration, requiredRole, requiredLevel, accountAge, serverAge, blacklistedRoles } = req.body;

    const giveaway = await giveawayService.createGiveaway(guildId, {
      hostId: req.user.id,
      prize,
      winners: parseInt(winners) || 1,
      endsAt: new Date(Date.now() + parseInt(duration) * 1000),
      requirements: {
        requiredRole: requiredRole || null,
        requiredLevel: parseInt(requiredLevel) || 0,
        accountAge: parseInt(accountAge) || 0,
        serverAge: parseInt(serverAge) || 0,
      },
      blacklistedRoles: blacklistedRoles || [],
    });

    res.json({ success: true, giveaway });
  } catch (error) {
    logger.error({ err: error }, 'Create giveaway error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /giveaways/:guildId/:giveawayId/end - End giveaway early
 */
router.post('/:guildId/:giveawayId/end', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, giveawayId } = req.params;
    await giveawayService.endGiveaway(giveawayId);
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'End giveaway error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /giveaways/:guildId/:giveawayId/reroll - Reroll giveaway
 */
router.post('/:guildId/:giveawayId/reroll', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, giveawayId } = req.params;
    const { winners } = req.body;

    await giveawayService.rerollGiveaway(giveawayId, parseInt(winners) || 1);
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Reroll giveaway error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /giveaways/:guildId/list - List giveaways (API)
 */
router.get('/:guildId/list', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const giveaways = await giveawayService.getGuildGiveaways(guildId, {
      status,
      page,
      limit,
    });

    res.json({ success: true, data: giveaways });
  } catch (error) {
    logger.error({ err: error }, 'Giveaways list error');
    res.status(500).json({ success: false, error: error.message });
  }
});

export const giveawaysRoutes = router;
export default router;