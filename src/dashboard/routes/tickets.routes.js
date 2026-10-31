/**
 * Tickets Routes - Ticket system management
 */
import express from 'express';
import { ticketService } from '../../services/ticket.service.js';
import { guildService } from '../../services/guild.service.js';
import { logger } from '../../utils/logger.js';
import { guildAccessMiddleware } from '../middleware/guildAccess.js';

const router = express.Router();

/**
 * GET /tickets/:guildId - Tickets overview
 */
router.get('/:guildId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await guildService.getGuild(guildId);
    const tickets = await ticketService.getGuildTickets(guildId);

    res.render('pages/tickets', {
      title: `${req.guild.name} - Tickets - StellarSentry`,
      user: req.user,
      guild: req.guild,
      settings,
      tickets,
    });
  } catch (error) {
    logger.error({ err: error }, 'Tickets page error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * GET /tickets/:guildId/:ticketId - Ticket details
 */
router.get('/:guildId/:ticketId', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, ticketId } = req.params;
    const ticket = await ticketService.getTicket(guildId, ticketId);

    if (!ticket) {
      return res.status(404).render('errors/404', { title: 'Ticket Not Found' });
    }

    res.render('pages/tickets/detail', {
      title: `Ticket #${ticketId} - ${req.guild.name}`,
      user: req.user,
      guild: req.guild,
      ticket,
    });
  } catch (error) {
    logger.error({ err: error }, 'Ticket detail error');
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
});

/**
 * POST /tickets/:guildId/:ticketId/close - Close ticket
 */
router.post('/:guildId/:ticketId/close', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, ticketId } = req.params;
    const { reason } = req.body;

    await ticketService.closeTicket(guildId, ticketId, req.user.id, reason);

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Close ticket error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /tickets/:guildId/:ticketId/claim - Claim ticket
 */
router.post('/:guildId/:ticketId/claim', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, ticketId } = req.params;
    await ticketService.claimTicket(guildId, ticketId, req.user.id);

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Claim ticket error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /tickets/:guildId/:ticketId/unclaim - Unclaim ticket
 */
router.post('/:guildId/:ticketId/unclaim', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, ticketId } = req.params;
    await ticketService.unclaimTicket(guildId, ticketId, req.user.id);

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Unclaim ticket error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /tickets/:guildId/:ticketId/add - Add user to ticket
 */
router.post('/:guildId/:ticketId/add', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, ticketId } = req.params;
    const { userId } = req.body;

    await ticketService.addUser(guildId, ticketId, userId);
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Add user to ticket error');
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /tickets/:guildId/:ticketId/remove - Remove user from ticket
 */
router.post('/:guildId/:ticketId/remove', guildAccessMiddleware, async (req, res) => {
  try {
    const { guildId, ticketId } = req.params;
    const { userId } = req.body;

    await ticketService.removeUser(guildId, ticketId, userId);
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Remove user from ticket error');
    res.status(400).json({ success: false, error: error.message });
  }
});

export const ticketsRoutes = router;
export default router;