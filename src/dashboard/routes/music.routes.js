/**
 * Music Routes - Music player dashboard
 */
import express from 'express';
import { musicService } from '../../services/music.service.js';
import { guildService } from '../../services/guild.service.js';
import { logger } from '../../utils/logger.js';
import { guildAccessMiddleware } from '../middleware/guildAccess.js';

const router = express.Router();

/**
 * GET /music/:guildId - Music player dashboard
 */
router.get('/:guildId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const playerState = musicService.getPlayerState(guildId);

    res.render('pages/music', {
      title: `${req.guild.name} - Music - StellarSentry`,
      user: req.user,
      guild: req.guild,
      settings,
      playerState,
    });
  } catch (error) {
    logger.error({ err: error }, 'Music page error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * POST /music/:guildId/control - Music controls
 */
router.post('/:guildId/control', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { action, value } = req.body;

    let result;
    switch (action) {
      case 'play':
        // Would need track info
        break;
      case 'pause':
        await musicService.pause(guildId);
        break;
      case 'resume':
        await musicService.resume(guildId);
        break;
      case 'skip':
        await musicService.skip(guildId);
        break;
      case 'stop':
        await musicService.stop(guildId);
        break;
      case 'volume':
        await musicService.setVolume(guildId, value);
        break;
      case 'loop':
        await musicService.setLoop(guildId, value);
        break;
      case 'shuffle':
        await musicService.shuffle(guildId);
        break;
      case 'seek':
        await musicService.seek(guildId, value);
        break;
    }

    const state = musicService.getPlayerState(guildId);
    res.json({ success: true, state });
  } catch (error) {
    logger.error({ err: error }, 'Music control error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /music/:guildId/state - Get player state
 */
router.get('/:guildId/state', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const state = musicService.getPlayerState(guildId);

    res.json({ success: true, data: state });
  } catch (error) {
    logger.error({ err: error }, 'Get player state error');
    res.status(500).json({ success: false, error: error.message });
  }
});

export const musicRoutes = router;
export default router;