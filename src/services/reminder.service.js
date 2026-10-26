/**
 * Reminder Service - Business logic for reminder management
 * Handles creation, checking, and sending of reminders
 */
import { Reminder } from '../database/models/Reminder.js';
import { logger } from '../utils/logger.js';
import { eventBus, EVENTS } from '../core/eventBus.js';

class ReminderService {
  /**
   * Initialize the reminder service
   * @param {Client} client - Discord.js client
   */
  async initialize(client) {
    this.client = client;

    // Load and send any overdue reminders on startup
    await this.processOverdueReminders();

    logger.info('Reminder service initialized');
  }

  /**
   * Create a new reminder
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const reminder = await Reminder.create({
      ...data,
      sent: false,
    });

    logger.info({ reminderId: reminder._id }, 'Reminder created');
    return reminder;
  }

  /**
   * Check and send due reminders
   * @param {Client} client
   */
  async checkReminders(client) {
    this.client = client;

    try {
      const now = new Date();

      // Find due reminders that haven't been sent
      const dueReminders = await Reminder.find({
        remindAt: { $lte: now },
        sent: { $ne: true },
      }).limit(100);

      for (const reminder of dueReminders) {
        try {
          await this.sendReminder(reminder);

          // Mark as sent
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
   * Process overdue reminders on startup
   */
  async processOverdueReminders() {
    try {
      const now = new Date();

      const overdueReminders = await Reminder.find({
        remindAt: { $lte: now },
        sent: { $ne: true },
      }).limit(50);

      for (const reminder of overdueReminders) {
        try {
          await this.sendReminder(reminder);

          reminder.sent = true;
          reminder.sentAt = new Date();
          await reminder.save();
        } catch (error) {
          logger.error({ err: error, reminderId: reminder._id }, 'Failed to send overdue reminder');
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Process overdue reminders error');
    }
  }

  /**
   * Send a reminder to the user
   * @param {Object} reminder
   */
  async sendReminder(reminder) {
    try {
      let sent = false;

      if (reminder.dm) {
        // Send via DM
        const user = await this.client.users.fetch(reminder.userId);
        if (user) {
          await user.send({
            embeds: [{
              title: '⏰ Reminder',
              description: reminder.message,
              color: 0x5865F2,
              timestamp: new Date(),
              footer: { text: 'StellarSentry Reminders' },
            }],
          });
          sent = true;
        }
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
          sent = true;
        }
      }

      if (sent) {
        // Emit event
        this.emitReminderEvent(reminder);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Emit reminder event
   * @param {Object} reminder
   */
  emitReminderEvent(reminder) {
    // This would be called via eventBus in the actual implementation
    // For now, we'll just log it
    logger.info({ reminderId: reminder._id, userId: reminder.userId }, 'Reminder sent');
  }

  /**
   * Delete old sent reminders (cleanup)
   */
  async cleanupOldReminders(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await Reminder.deleteMany({
      sent: true,
      sentAt: { $lt: cutoff },
    });
    return result.deletedCount;
  }

  /**
   * Get user's reminders
   * @param {string} guildId
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getUserReminders(guildId, userId) {
    return Reminder.find({ guildId, userId, sent: false })
      .sort({ remindAt: 1 });
  }

  /**
   * Cancel a reminder
   * @param {string} reminderId
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async cancelReminder(reminderId, userId) {
    const result = await Reminder.deleteOne({
      _id: reminderId,
      userId,
      sent: false,
    });
    return result.deletedCount > 0;
  }
}

export const reminderService = new ReminderService();
export default reminderService;