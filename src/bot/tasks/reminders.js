/**
 * Reminder Task - Checks and sends due reminders
 * Runs every minute via node-cron
 */
import { Reminder } from '../../database/models/Reminder.js';
import { logger } from '../../utils/logger.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';

/**
 * Check and process due reminders
 * @param {Client} client - Discord.js client
 */
export async function checkReminders(client) {
  try {
    const now = new Date();

    // Find due reminders that haven't been sent
    const dueReminders = await Reminder.find({
      remindAt: { $lte: now },
      sent: { $ne: true },
    }).limit(100);

    for (const reminder of dueReminders) {
      try {
        await sendReminder(client, reminder);

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
 * Send a reminder to the user
 * @param {Client} client
 * @param {Document} reminder
 */
async function sendReminder(client, reminder) {
  try {
    let target;

    if (reminder.dm) {
      // Send via DM
      const user = await client.users.fetch(reminder.userId);
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
      }
    } else if (reminder.channelId) {
      // Send in channel
      const channel = await client.channels.fetch(reminder.channelId);
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

    // Emit event
    eventBus.emit(EVENTS.REMINDER_DUE, {
      reminderId: reminder._id,
      userId: reminder.userId,
      guildId: reminder.guildId,
      message: reminder.message,
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Create a new reminder
 * @param {Object} data
 * @returns {Promise<Document>}
 */
export async function createReminder(data) {
  return Reminder.create(data);
}

/**
 * Delete old sent reminders (cleanup)
 */
export async function cleanupOldReminders(days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await Reminder.deleteMany({
    sent: true,
    sentAt: { $lt: cutoff },
  });
  return result.deletedCount;
}

export default { checkReminders, createReminder, cleanupOldReminders };