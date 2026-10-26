/**
 * Leveling Routes - Leveling system settings
 */
import express from 'express';
import { body, validationResult } from 'express-validator';
import { guildService } from '../../services/guild.service.js';

const router = express.Router();

/**
 * GET /leveling/:guildId - Leveling settings
 */
router.get('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const leveling = settings?.leveling || {};

    const roles = req.guild.roles.cache
      .filter(r => r.id !== req.guild.id)
      .map(r => ({ id: r.id, name: r.name, position: r.position }))
      .sort((a, b) => b.position - a.position);

    const channels = req.guild.channels.cache
      .filter(c => c.isTextBased())
      .map(c => ({ id: c.id, name: c.name }));

    res.render('pages/leveling', {
      title: `${req.guild.name} - Leveling - StellarSentry`,
      user: req.user,
      guild: req.guild,
      settings,
      leveling,
      roles,
      channels,
    });
  } catch (error) {
    console.error('Leveling error:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load leveling settings',
    });
  }
});

/**
 * POST /leveling/:guildId - Update leveling settings
 */
router.post('/:guildId', [
  body('enabled').optional().isBoolean(),
  body('xpPerMessage').optional().isInt({ min: 1, max: 100 }),
  body('xpCooldown').optional().isInt({ min: 0, max: 3600 }),
  body('multiplier').optional().isFloat({ min: 0.1, max: 10 }),
  body('levelUpChannel').optional().isString(),
  body('levelUpMessage').optional().isLength({ max: 500 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { guildId } = req.params;
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (['enabled', 'xpPerMessage', 'xpCooldown', 'multiplier', 'levelUpChannel', 'levelUpMessage', 'ignoredChannels', 'ignoredRoles'].includes(key)) {
        updates[`leveling.${key}`] = req.body[key];
      }
    });

    await guildService.updateSettings(guildId, updates);
    req.flash('success', 'Leveling settings updated');
    res.redirect('back');
  } catch (error) {
    console.error('Update leveling error:', error);
    res.status(500).json({ success: false, error: 'Failed to update leveling settings' });
  }
});

/**
 * POST /leveling/:guildId/role-rewards - Add/Update role reward
 */
router.post('/:guildId/role-rewards', [
  body('level').isInt({ min: 1, max: 1000 }),
  body('role').isString(),
], async (req, res) => {
  try {
    const { guildId } = req.params;
    const { level, role } = req.body;

    await guildService.addRoleReward(guildId, level, role);
    req.flash('success', 'Role reward added');
    res.redirect('back');
  } catch (error) {
    console.error('Add role reward error:', error);
    res.status(500).json({ success: false, error: 'Failed to add role reward' });
  }
});

/**
 * DELETE /leveling/:guildId/role-rewards/:level - Remove role reward
 */
router.delete('/:guildId/role-rewards/:level', async (req, res) => {
  try {
    const { guildId, level } = req.params;
    await guildService.removeRoleReward(guildId, parseInt(level));
    res.json({ success: true });
  } catch (error) {
    console.error('Remove role reward error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove role reward' });
  }
});

export default router;