/**
 * Suggestions Routes - Suggestions management
 */
import express from 'express';
import { Suggestion } from '../../database/models/Suggestion.js';
import { guildService } from '../../services/guild.service.js';
import { logger } from '../../utils/logger.js';
import { guildAccessMiddleware } from '../middleware/guildAccess.js';

const router = express.Router();

/**
 * GET /suggestions/:guildId - Suggestions overview
 */
router.get('/:guildId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const suggestions = await Suggestion.find({ guildId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.render('pages/suggestions', {
      title: `${req.guild.name} - Suggestions - StellarSentry`,
      user: req.user,
      guild: req.guild,
      settings,
      suggestions,
    });
  } catch (error) {
    logger.error({ err: error }, 'Suggestions page error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * GET /suggestions/:guildId/:suggestionId - Suggestion details
 */
router.get('/:guildId/:suggestionId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, suggestionId } = req.params;
    const suggestion = await Suggestion.findById(suggestionId);

    if (!suggestion || suggestion.guildId !== guildId) {
      return res.status(404).render('errors/404', { title: 'Suggestion Not Found' });
    }

    res.render('pages/suggestions/detail', {
      title: `Suggestion - ${suggestion.title}`,
      user: req.user,
      guild: req.guild,
      suggestion,
    });
  } catch (error) {
    logger.error({ err: error }, 'Suggestion detail error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * POST /suggestions/:guildId/:suggestionId/approve - Approve suggestion
 */
router.post('/:guildId/:suggestionId/approve', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, suggestionId } = req.params;
    const { reason, notes } = req.body;

    const suggestion = await Suggestion.findById(suggestionId);
    if (!suggestion || suggestion.guildId !== guildId) {
      return res.status(404).json({ success: false, error: 'Suggestion not found' });
    }

    suggestion.approve(req.user.id, reason, notes);
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Approve suggestion error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /suggestions/:guildId/:suggestionId/deny - Deny suggestion
 */
router.post('/:guildId/:suggestionId/deny', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, suggestionId } = req.params;
    const { reason, notes } = req.body;

    const suggestion = await Suggestion.findById(suggestionId);
    if (!suggestion || suggestion.guildId !== guildId) {
      return res.status(404).json({ success: false, error: 'Suggestion not found' });
    }

    suggestion.deny(req.user.id, reason, notes);
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Deny suggestion error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /suggestions/:guildId/:suggestionId/consider - Consider suggestion
 */
router.post('/:guildId/:suggestionId/consider', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, suggestionId } = req.params;
    const { reason, notes } = req.body;

    const suggestion = await Suggestion.findById(suggestionId);
    if (!suggestion || suggestion.guildId !== guildId) {
      return res.status(404).json({ success: false, error: 'Suggestion not found' });
    }

    suggestion.consider(req.user.id, reason, notes);
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Consider suggestion error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /suggestions/:guildId/:suggestionId/implement - Implement suggestion
 */
router.post('/:guildId/:suggestionId/implement', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, suggestionId } = req.params;
    const { notes } = req.body;

    const suggestion = await Suggestion.findById(suggestionId);
    if (!suggestion || suggestion.guildId !== guildId) {
      return res.status(404).json({ success: false, error: 'Suggestion not found' });
    }

    suggestion.implement(req.user.id, notes);
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Implement suggestion error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /suggestions/:guildId/list - List suggestions (API)
 */
router.get('/:guildId/list', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const status = req.query.status;

    const query = { guildId };
    if (status) query.status = status;

    const [suggestions, total] = await Promise.all([
      Suggestion.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * 20)
        .limit(20)
        .lean(),
      Suggestion.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: suggestions,
      pagination: {
        page,
        limit: 20,
        total,
        pages: Math.ceil(total / 20),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Suggestions list error');
    res.status(500).json({ success: false, error: error.message });
  }
});

export const suggestionsRoutes = router;
export default router;