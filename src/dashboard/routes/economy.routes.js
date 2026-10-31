/**
 * Economy Routes - Economy system management
 */
import express from 'express';
import { env } from '../../config/env.js';
import { economyService } from '../../services/economy.service.js';
import { guildService } from '../../services/guild.service.js';
import { logger } from '../../utils/logger.js';
import { guildAccessMiddleware } from '../middleware/guildAccess.js';

const router = express.Router();

/**
 * GET /economy/:guildId - Economy overview
 */
router.get('/:guildId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const economy = settings?.economy || {};

    res.render('pages/economy', {
      title: `${req.guild.name} - Economy - StellarSentry`,
      user: req.user,
      guild: req.guild,
      settings,
      economy,
    });
  } catch (error) {
    logger.error({ err: error }, 'Economy page error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * GET /economy/:guildId/shop - Shop management
 */
router.get('/:guildId/shop', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const shop = settings?.economy?.shop || [];

    res.render('pages/economy/shop', {
      title: `${req.guild.name} - Shop - StellarSentry`,
      user: req.user,
      guild: req.guild,
      shop,
    });
  } catch (error) {
    logger.error({ err: error }, 'Shop page error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * POST /economy/:guildId/shop - Add shop item
 */
router.post('/:guildId/shop', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { name, description, price, roleId, stock, maxPerUser, requirements } = req.body;

    const item = await economyService.addShopItem(guildId, {
      name,
      description,
      price: parseInt(price),
      roleId,
      stock: parseInt(stock) || -1,
      maxPerUser: parseInt(maxPerUser) || 1,
      requirements: {
        level: parseInt(requirements?.level) || 0,
        roles: requirements?.roles || [],
        badge: requirements?.badge || null,
      },
    });

    res.json({ success: true, item });
  } catch (error) {
    logger.error({ err: error }, 'Add shop item error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * PUT /economy/:guildId/shop/:itemId - Update shop item
 */
router.put('/:guildId/shop/:itemId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, itemId } = req.params;
    const updates = req.body;

    const item = await economyService.updateShopItem(guildId, itemId, updates);
    res.json({ success: true, item });
  } catch (error) {
    logger.error({ err: error }, 'Update shop item error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /economy/:guildId/shop/:itemId - Remove shop item
 */
router.delete('/:guildId/shop/:itemId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, itemId } = req.params;
    await economyService.removeShopItem(guildId, itemId);
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Remove shop item error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /economy/:guildId/leaderboard - Economy leaderboard
 */
router.get('/:guildId/leaderboard', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const leaderboard = await economyService.getLeaderboard(guildId, limit, page);

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    logger.error({ err: error }, 'Leaderboard error');
    res.status(500).json({ success: false, error: error.message });
  }
});

export const economyRoutes = router;
export default router;