/**
 * Message Reaction Remove Event - Handle starboard and reaction roles
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { StarboardEntry } from '../../../database/models/StarboardEntry.js';
import { logger } from '../../../utils/logger.js';
import { eventBus, EVENTS } from '../../../core/eventBus.js';

export default {
  name: 'messageReactionRemove',
  once: false,
  async execute(reaction, user) {
    // Ignore partials, bots, DMs
    if (reaction.partial || user.bot || !reaction.message.guild) return;

    try {
      const settings = await guildService.getGuild(reaction.message.guild.id);

      // Handle starboard
      if (settings?.starboard?.enabled) {
        await handleStarboard(reaction, user, settings);
      }

      // Handle reaction roles
      if (settings?.reactionRoles?.enabled) {
        await handleReactionRoles(reaction, user, settings, 'remove');
      }
    } catch (error) {
      logger.error({ err: error, guildId: reaction.message.guild.id }, 'Reaction remove error');
    }
  },
};

async function handleStarboard(reaction, user, settings) {
  const starboard = settings.starboard;
  const starEmoji = starboard.emoji || '⭐';

  // Check if this is the starboard emoji
  const isStarEmoji = reaction.emoji.name === starEmoji ||
    (reaction.emoji.id && reaction.emoji.id === starEmoji);

  if (!isStarEmoji) return;

  // Find starboard entry
  const entry = await StarboardEntry.findOne({
    guildId: reaction.message.guild.id,
    messageId: reaction.message.id,
  });

  if (!entry) return;

  // Remove star from entry
  entry.removeStar(user.id);
  entry.starCount = reaction.count;

  // If below threshold, remove from starboard
  if (reaction.count < (starboard.threshold || 5)) {
    try {
      const starboardChannel = reaction.message.guild.channels.cache.get(starboard.channel);
      if (starboardChannel) {
        const starMessage = await starboardChannel.messages.fetch(entry.starboardMessageId);
        await starMessage.delete();
      }
    } catch (e) {
      // Message might already be deleted
    }
    entry.markDeleted();
  } else {
    // Update star count on starboard message
    try {
      const starboardChannel = reaction.message.guild.channels.cache.get(starboard.channel);
      if (starboardChannel) {
        const starMessage = await starboardChannel.messages.fetch(entry.starboardMessageId);
        const embed = starMessage.embeds[0];
        if (embed) {
          const newEmbed = EmbedBuilder.from(embed)
            .setFields(embed.fields.map(f =>
              f.name.includes('Stars') ? { name: f.name, value: `${starEmoji} ${reaction.count}`, inline: f.inline } : f
            ));
          await starMessage.edit({ embeds: [newEmbed] });
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  await entry.save();
  eventBus.emit(EVENTS.STARBOARD_REMOVE, { guildId: reaction.message.guild.id, entry });
}

async function handleReactionRoles(reaction, user, settings, action) {
  // Placeholder for reaction roles handling
  // Would check panels and assign/remove roles
}