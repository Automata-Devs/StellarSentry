/**
 * Ticket Service - Business logic for ticket management
 * Handles ticket creation, closing, claiming, and user management
 */
import { ticketRepository } from '../database/repositories/TicketRepository.js';
import { guildService } from './guild.service.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { logger } from '../utils/logger.js';

class TicketService {
  /**
   * Create a new ticket
   * @param {Object} data - Ticket data
   * @returns {Promise<Object>} Created ticket
   */
  async createTicket(data) {
    try {
      const ticket = await ticketRepository.create({
        guildId: data.guildId,
        channelId: data.channelId,
        userId: data.userId,
        claimedBy: data.claimedBy || null,
        status: 'open',
        reason: data.reason || 'No reason provided',
        createdAt: new Date(),
      });

      // Emit event for real-time updates
      eventBus.emit(EVENTS.TICKET_CREATE, {
        guildId: data.guildId,
        ticketId: ticket._id,
        userId: data.userId
      });

      logger.info({ ticketId: ticket._id, guildId: data.guildId, userId: data.userId }, 'Ticket created');
      return ticket;
    } catch (error) {
      logger.error({ err: error, guildId: data.guildId }, 'Failed to create ticket');
      throw error;
    }
  }

  /**
   * Get ticket by ID
   * @param {string} guildId
   * @param {string} ticketId
   * @returns {Promise<Object|null>}
   */
  async getTicket(guildId, ticketId) {
    return ticketRepository.findByGuildAndTicket(guildId, ticketId);
  }

  /**
   * Get ticket by channel ID
   * @param {string} channelId
   * @returns {Promise<Object|null>}
   */
  async getTicketByChannel(channelId) {
    return ticketRepository.findByChannel(channelId);
  }

  /**
   * Get all tickets for a guild
   * @param {string} guildId
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getGuildTickets(guildId, options = {}) {
    return ticketRepository.findByGuild(guildId, options);
  }

  /**
   * Get open tickets count for a guild
   * @param {string} guildId
   * @returns {Promise<number>}
   */
  async getOpenCount(guildId) {
    return ticketRepository.count({ guildId, status: 'open' });
  }

  /**
   * Get user's open tickets
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getUserTickets(guildId, userId) {
    return ticketRepository.find({ guildId, userId, status: 'open' });
  }

  /**
   * Close a ticket
   * @param {string} guildId
   * @param {string} ticketId
   * @param {string} userId - User closing the ticket
   * @param {string} reason - Reason for closing
   * @returns {Promise<Object>}
   */
  async closeTicket(guildId, ticketId, userId, reason = 'No reason provided') {
    const ticket = await ticketRepository.findByGuildAndTicket(guildId, ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.status === 'closed') {
      throw new Error('Ticket is already closed');
    }

    await ticketRepository.updateStatus(ticket._id, 'closed');
    await ticketRepository.setClosedAt(ticket._id, new Date());

    // Emit event
    eventBus.emit(EVENTS.TICKET_CLOSE, {
      guildId,
      ticketId,
      userId,
      reason
    });

    logger.info({ ticketId, guildId, userId }, 'Ticket closed');
    return { success: true };
  }

  /**
   * Claim a ticket
   * @param {string} guildId
   * @param {string} ticketId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async claimTicket(guildId, ticketId, userId) {
    const ticket = await ticketRepository.findByGuildAndTicket(guildId, ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.claimedBy) {
      throw new Error('Ticket is already claimed');
    }

    await ticketRepository.claimTicket(ticket._id, userId);

    // Emit event
    eventBus.emit(EVENTS.TICKET_CLAIM, {
      guildId,
      ticketId,
      userId
    });

    logger.info({ ticketId, guildId, userId }, 'Ticket claimed');
    return { success: true };
  }

  /**
   * Unclaim a ticket
   * @param {string} guildId
   * @param {string} ticketId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async unclaimTicket(guildId, ticketId, userId) {
    const ticket = await ticketRepository.findByGuildAndTicket(guildId, ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.claimedBy !== userId) {
      throw new Error('You can only unclaim your own tickets');
    }

    await ticketRepository.unclaimTicket(ticket._id);
    return { success: true };
  }

  /**
   * Add user to ticket
   * @param {string} guildId
   * @param {string} ticketId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async addUser(guildId, ticketId, userId) {
    const ticket = await ticketRepository.findByGuildAndTicket(guildId, ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.participants?.includes(userId)) {
      throw new Error('User is already in this ticket');
    }

    await ticketRepository.addUser(guildId, ticketId, userId);
    return { success: true };
  }

  /**
   * Remove user from ticket
   * @param {string} guildId
   * @param {string} ticketId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async removeUser(guildId, ticketId, userId) {
    const ticket = await ticketRepository.findByGuildAndTicket(guildId, ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (!ticket.participants?.includes(userId)) {
      throw new Error('User is not in this ticket');
    }

    await ticketRepository.removeUser(guildId, ticketId, userId);
    return { success: true };
  }

  /**
   * Get ticket statistics for a guild
   * @param {string} guildId
   * @returns {Promise<Object>}
   */
  async getStats(guildId) {
    const [open, closed, total] = await Promise.all([
      ticketRepository.count({ guildId, status: 'open' }),
      ticketRepository.count({ guildId, status: 'closed' }),
      ticketRepository.count({ guildId }),
    ]);

    return { open, closed, total };
  }
}

export const ticketService = new TicketService();
export default ticketService;