/**
 * Giveaway Task - Checks and ends due giveaways
 * Runs every 30 seconds via node-cron
 */
import { Giveaway } from '../../database/models/Giveaway.js';
import { giveawayRepository } from '../../database/repositories/GiveawayRepository.js';
import { logger } from '../../utils/logger.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';

/**
 * Check and end due giveaways
 * @param {Client} client - Discord.js client
 */
export async function checkGiveaways(client) {
  try {
    // Find giveaways that should end now
    const endingGiveaways = await giveawayRepository.getEndingNow();

    for (const giveaway of endingGiveaways) {
      try {
        await endGiveaway(client, giveaway);
      } catch (error) {
        logger.error({ err: error, giveawayId: giveaway._id }, 'Failed to end giveaway');
      }
    }

    // Find giveaways that should start now
    const startingGiveaways = await giveawayRepository.getStartingNow();

    for (const giveaway of startingGiveaways) {
      try {
        await startGiveaway(client, giveaway);
      } catch (error) {
        logger.error({ err: error, giveawayId: giveaway._id }, 'Failed to start giveaway');
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Giveaway check error');
  }
}

/**
 * Start a scheduled giveaway
 * @param {Client} client
 * @param {Document} giveaway
 */
async function startGiveaway(client, giveaway) {
  try {
    // Update status
    await giveawayRepository.start(giveaway.messageId);

    // Fetch message and add reaction/button
    const channel = await client.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(giveaway.messageId);

    // Add reaction or update components
    // The message should already have the button from creation
    // Just update status to active
    await message.edit({
      components: message.components.map(row => ({
        ...row,
        components: row.components.map(comp => ({
          ...comp,
          disabled: false,
        })),
      })),
    });

    eventBus.emit(EVENTS.GIVEAWAY_START, {
      guildId: giveaway.guildId,
      giveawayId: giveaway._id,
      messageId: giveaway.messageId,
    });
  } catch (error) {
    logger.error({ err: error, giveawayId: giveaway._id }, 'Failed to start giveaway');
  }
}

/**
 * End a giveaway and pick winners
 * @param {Client} client
 * @param {Document} giveaway
 */
async function endGiveaway(client, giveaway) {
  try {
    const channel = await client.channels.fetch(giveaway.channelId);
    if (!channel) {
      await giveawayRepository.cancel(giveaway.messageId);
      return;
    }

    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (!message) {
      await giveawayRepository.cancel(giveaway.messageId);
      return;
    }

    const entries = giveaway.entries || [];

    let winners = [];
    if (entries.length > 0) {
      // Shuffle and pick winners
      const shuffled = [...entries].sort(() => Math.random() - 0.5);
      winners = shuffled.slice(0, giveaway.winners).map(e => e.userId);
    }

    // End giveaway in database
    await giveawayRepository.end(giveaway.messageId, winners);

    // Update message
    if (message) {
      const winnerMentions = winners.length > 0
        ? winners.map(w => `<@${w}>`).join(', ')
        : 'No valid entries';

      const embed = message.embeds[0];
      const newEmbed = {
        ...embed,
        title: `🎉 ${giveaway.prize} (ENDED)`,
        color: 0x3BA55C,
        description: `**Winner(s):** ${winnerMentions}\n**Entries:** ${giveaway.entryCount}\nCongratulations!`,
        timestamp: new Date(),
      };

      await message.edit({
        embeds: [newEmbed],
        components: [],
      });
    }

    // DM winners
    for (const winnerId of winners) {
      try {
        const user = await client.users.fetch(winnerId);
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

    eventBus.emit(EVENTS.GIVEAWAY_END, {
      guildId: giveaway.guildId,
      giveawayId: giveaway._id,
      winners,
    });
  } catch (error) {
    logger.error({ err: error, giveawayId: giveaway._id }, 'Failed to end giveaway');
    throw error;
  }
}

/**
 * Clean up old cancelled giveaways
 */
export async function cleanupOldGiveaways(days = 90) {
  return giveawayRepository.deleteOldCancelled(days);
}

export default { checkGiveaways, endGiveaway, startGiveaway, cleanupOldGiveaways };