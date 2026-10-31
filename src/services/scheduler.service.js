/**
 * Scheduler Service - Handles scheduled tasks
 * Manages reminders, giveaway endings, temp bans, temp roles cleanup
 */
import { Reminder } from '../database/models/Reminder.js';
import { Giveaway } from '../database/models/Giveaway.js';
import { memberRepository } from '../database/repositories/MemberRepository.js';
import { logger } from '../utils/logger.js';
import { eventBus, EVENTS } from '../core/eventBus.js';

class SchedulerService {
  constructor() {
    this.intervals = new Map();
  }

  /**
   * Initialize the scheduler
   * @param {Client} client - Discord.js client
   */
  async initialize(client) {
    this.client = client;

    // Check reminders every minute
    this.intervals.set('reminders', setInterval(async () => {
      await this.checkReminders();
    }, 60 * 1000));

    // Check giveaways every 30 seconds
    this.intervals.set('giveaways', setInterval(async () => {
      await this.checkGiveaways();
    }, 30 * 1000));

    // Check temp bans/roles every minute
    this.intervals.set('tempbans', setInterval(async () => {
      await this.checkTempBans();
    }, 60 * 1000));

    logger.info('Scheduler service initialized');
  }

  /**
   * Check and send due reminders
   */
  async checkReminders() {
    try {
      const now = new Date();
      const dueReminders = await Reminder.find({
        remindAt: { $lte: now },
        sent: { $ne: true },
      }).limit(100);

      for (const reminder of dueReminders) {
        try {
          await this.sendReminder(reminder);
          reminder.sent = true;
          reminder.sentAt = new Date();
          await reminder.save();
        } catch (error) {
          logger.error({ err: error, reminderId: reminder._id }, 'Failed to send reminder');
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Reminder check error');
    }
  }

  /**
   * Send a reminder to the user
   * @param {Object} reminder
   */
  async sendReminder(reminder) {
    try {
      const user = await this.client.users.fetch(reminder.userId);
      if (!user) return;

      if (reminder.dm) {
        // Send via DM
        await user.send({
          embeds: [{
            title: '⏰ Reminder',
            description: reminder.message,
            color: 0x5865F2,
            timestamp: new Date(),
            footer: { text: 'StellarSentry Reminders' },
          }],
        });
      } else if (reminder.channelId) {
        // Send in channel
        const channel = await this.client.channels.fetch(reminder.channelId);
        if (channel && channel.isTextBased()) {
          await channel.send({
            content: `<@${reminder.userId}>`,
            embeds: [{
              title: '⏰ Reminder',
              description: reminder.message,
              color: 0x5865F2,
              timestamp: new Date(),
              footer: { text: 'StellarSentry Reminders' },
            }],
          });
        }
      }
    } catch (error) {
      logger.error({ err: error, reminderId: reminder._id }, 'Failed to send reminder');
    }
  }

  /**
   * Check and end due giveaways
   */
  async checkGiveaways() {
    try {
      const { Giveaway } = await import('../database/models/Giveaway.js');
      const endingGiveaways = await Giveaway.find({
        status: 'active',
        endsAt: { $lte: new Date() },
      }).limit(50);

      for (const giveaway of endingGiveaways) {
        try {
          await this.endGiveaway(giveaway);
        } catch (error) {
          logger.error({ err: error, giveawayId: giveaway._id }, 'Failed to end giveaway');
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Giveaway check error');
    }
  }

  /**
   * End a giveaway
   * @param {Object} giveaway
   */
  async endGiveaway(giveaway) {
    try {
      const channel = await this.client.channels.fetch(giveaway.channelId);
      if (!channel) return;

      const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
      if (!message) return;

      const entries = giveaway.entries || [];
      let winners = [];

      if (entries.length > 0) {
        const shuffled = [...entries].sort(() => Math.random() - 0.5);
        winners = shuffled.slice(0, giveaway.winners).map(e => e.userId);
      }

      await giveaway.end(winners);

      // Update message
      if (message) {
        const winnerMentions = winners.length > 0
          ? winners.map(w => `<@${w}>`).join(', ')
          : 'No valid entries';

        const embed = {
          title: `🎉 ${giveaway.prize} (ENDED)`,
          color: 0x3BA55C,
          description: `**Winner(s):** ${winnerMentions}\n**Entries:** ${giveaway.entryCount}\nCongratulations!`,
          timestamp: new Date(),
        };

        await message.edit({ embeds: [embed], components: [] });
      }

      // DM winners
      for (const winnerId of winners) {
        try {
          const user = await this.client.users.fetch(winnerId);
          await user.send({
            embeds: [{
              title: '🎉 You Won!',
              description: `You won **${giveaway.prize}** in **${channel.guild.name}**!\nContact the host to claim your prize.`,
              color: 0x3BA55C,
              timestamp: new Date(),
            }],
          });
        } catch (e) {
          // Ignore DM failures
        }
      }

      // Emit event
      this.emitGiveawayEnd(giveaway, winners);
    } catch (error) {
      logger.error({ err: error, giveawayId: giveaway._id }, 'Failed to end giveaway');
    }
  }

  /**
   * Check and remove expired temp bans
   */
  async checkTempBans() {
    try {
      // This would check for expired temporary bans
      // Implementation depends on how temp bans are stored
      logger.debug('Checking expired temp bans');
    } catch (error) {
      logger.error({ err: error }, 'Temp ban check error');
    }
  }

  /**
   * Check and remove expired temp roles
   */
  async checkTempRoles() {
    try {
      // This would check for expired temporary roles
      // Implementation depends on how temp roles are stored
      logger.debug('Checking expired temp roles');
    } catch (error) {
      logger.error({ err: error }, 'Temp role check error');
    }
  }

  /**
   * Emit giveaway end event
   */
  emitGiveawayEnd(giveaway, winners) {
    // Emit event for real-time updates
    // eventBus.emit(EVENTS.GIVEAWAY_END, { ... });
  }

  /**
   * Shutdown the scheduler
   */
  shutdown() {
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
    logger.info('Scheduler service shut down');
  }
}

export const schedulerService = new SchedulerService();
export default schedulerService;