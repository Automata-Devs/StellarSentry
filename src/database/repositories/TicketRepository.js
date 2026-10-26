/**
 * Ticket repository - Ticket data access
 */
import { BaseRepository } from './BaseRepository.js';
import { Ticket } from '../models/Ticket.js';

class TicketRepository extends BaseRepository {
  constructor() {
    super(Ticket);
  }

  /**
   * Get ticket by channel ID
   * @param {string} channelId
   * @returns {Promise<Document|null>}
   */
  async getByChannelId(channelId) {
    return this.findOne({ channelId });
  }

  /**
   * Get ticket by guild and ticket ID
   * @param {string} guildId
   * @param {number} ticketId
   * @returns {Promise<Document|null>}
   */
  async getByTicketId(guildId, ticketId) {
    return this.findOne({ guildId, ticketId });
  }

  /**
   * Get next ticket ID for guild
   * @param {string} guildId
   * @returns {Promise<number>}
   */
  async getNextTicketId(guildId) {
    const lastTicket = await this.findOne({ guildId }, { sort: { ticketId: -1 }, projection: { ticketId: 1 } });
    return (lastTicket?.ticketId || 0) + 1;
  }

  /**
   * Get open tickets for guild
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<Document[]>}
   */
  async getOpenTickets(guildId, userId = null) {
    const query = {
      guildId,
      status: { $in: ['open', 'claimed', 'in_progress', 'waiting'] },
    };
    if (userId) query.userId = userId;
    return this.find(query, { sort: { createdAt: -1 } });
  }

  /**
   * Get tickets by status
   * @param {string} guildId
   * @param {string} status
   * @returns {Promise<Document[]>}
   */
  async getByStatus(guildId, status) {
    return this.find({ guildId, status }, { sort: { createdAt: -1 } });
  }

  /**
   * Get tickets claimed by moderator
   * @param {string} guildId
   * @param {string} moderatorId
   * @returns {Promise<Document[]>}
   */
  async getClaimedBy(guildId, moderatorId) {
    return this.find(
      { guildId, claimedBy: moderatorId, status: { $in: ['claimed', 'in_progress'] } },
      { sort: { createdAt: -1 } }
    );
  }

  /**
   * Get tickets assigned to moderator
   * @param {string} guildId
   * @param {string} moderatorId
   * @returns {Promise<Document[]>}
   */
  async getAssignedTo(guildId, moderatorId) {
    return this.find(
      { guildId, assignedTo: moderatorId, status: { $in: ['open', 'claimed', 'in_progress', 'waiting'] } },
      { sort: { createdAt: -1 } }
    );
  }

  /**
   * Get ticket stats for guild
   * @param {string} guildId
   * @returns {Promise<Object>}
   */
  async getStats(guildId) {
    return this.model.aggregate([
      { $match: { guildId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).then(results => {
      const stats = { open: 0, claimed: 0, in_progress: 0, waiting: 0, closed: 0, deleted: 0, total: 0 };
      for (const r of results) {
        stats[r._id] = r.count;
        stats.total += r.count;
      }
      return stats;
    });
  }

  /**
   * Close ticket
   * @param {string} channelId
   * @param {string} closedBy
   * @param {string} reason
   * @param {string} closeType
   * @returns {Promise<Document|null>}
   */
  async closeTicket(channelId, closedBy, reason, closeType = 'resolved') {
    return this.findOneAndUpdate(
      { channelId },
      {
        $set: {
          status: 'closed',
          closedBy,
          closedAt: new Date(),
          closeReason: reason,
          closeType,
          lastActivityAt: new Date(),
        },
      },
      { new: true }
    );
  }

  /**
   * Reopen ticket
   * @param {string} channelId
   * @returns {Promise<Document|null>}
   */
  async reopenTicket(channelId) {
    return this.findOneAndUpdate(
      { channelId },
      {
        $set: {
          status: 'open',
          closedBy: null,
          closedAt: null,
          closeReason: null,
          closeType: null,
          lastActivityAt: new Date(),
        },
      },
      { new: true }
    );
  }

  /**
   * Claim ticket
   * @param {string} channelId
   * @param {string} moderatorId
   * @returns {Promise<Document|null>}
   */
  async claimTicket(channelId, moderatorId) {
    return this.findOneAndUpdate(
      { channelId },
      {
        $set: {
          status: 'claimed',
          claimedBy: moderatorId,
          claimedAt: new Date(),
          lastActivityAt: new Date(),
        },
      },
      { new: true }
    );
  }

  /**
   * Add participant
   * @param {string} channelId
   * @param {string} userId
   * @param {string} addedBy
   * @returns {Promise<Document|null>}
   */
  async addParticipant(channelId, userId, addedBy) {
    return this.findOneAndUpdate(
      { channelId },
      { $addToSet: { participants: { userId, addedBy, addedAt: new Date() } } },
      { new: true }
    );
  }

  /**
   * Remove participant
   * @param {string} channelId
   * @param {string} userId
   * @returns {Promise<Document|null>}
   */
  async removeParticipant(channelId, userId) {
    return this.findOneAndUpdate(
      { channelId },
      { $pull: { participants: { userId } } },
      { new: true }
    );
  }

  /**
   * Increment message count
   * @param {string} channelId
   * @param {string} messageId
   * @returns {Promise<Document|null>}
   */
  async incrementMessageCount(channelId, messageId) {
    return this.findOneAndUpdate(
      { channelId },
      {
        $inc: { messageCount: 1 },
        $set: { lastMessageId: messageId, lastActivityAt: new Date() },
        $setOnInsert: { firstMessageId: messageId },
      },
      { new: true }
    );
  }

  /**
   * Set transcript
   * @param {string} channelId
   * @param {string} url
   * @param {number} messageCount
   * @returns {Promise<Document|null>}
   */
  async setTranscript(channelId, url, messageCount) {
    return this.findOneAndUpdate(
      { channelId },
      {
        $set: {
          'transcript.generated': true,
          'transcript.url': url,
          'transcript.generatedAt': new Date(),
          'transcript.messageCount': messageCount,
        },
      },
      { new: true }
    );
  }

  /**
   * Rate ticket
   * @param {string} channelId
   * @param {number} score
   * @param {string} feedback
   * @returns {Promise<Document|null>}
   */
  async rateTicket(channelId, score, feedback) {
    return this.findOneAndUpdate(
      { channelId },
      {
        $set: {
          'rating.score': score,
          'rating.feedback': feedback,
          'rating.ratedAt': new Date(),
        },
      },
      { new: true }
    );
  }

  /**
   * Add tag
   * @param {string} channelId
   * @param {string} tag
   * @returns {Promise<Document|null>}
   */
  async addTag(channelId, tag) {
    return this.findOneAndUpdate(
      { channelId },
      { $addToSet: { tags: tag } },
      { new: true }
    );
  }

  /**
   * Remove tag
   * @param {string} channelId
   * @param {string} tag
   * @returns {Promise<Document|null>}
   */
  async removeTag(channelId, tag) {
    return this.findOneAndUpdate(
      { channelId },
      { $pull: { tags: tag } },
      { new: true }
    );
  }

  /**
   * Delete old closed tickets
   * @param {string} guildId
   * @param {number} days
   * @returns {Promise<number>}
   */
  async deleteOldClosed(guildId, days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.deleteMany({
      guildId,
      status: { $in: ['closed', 'deleted'] },
      closedAt: { $lt: cutoff },
    });
    return result;
  }
}

export const ticketRepository = new TicketRepository();
export default ticketRepository;