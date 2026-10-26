/**
 * Message Reaction Add Event - Handle starboard and reaction roles
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { StarboardEntry } from '../../../database/models/StarboardEntry.js';
import { logger } from '../../../utils/logger.js';
import { eventBus, EVENTS } from '../../../core/eventBus.js';

export default {
  name: 'messageReactionAdd',
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
        await handleReactionRoles(reaction, user, settings, 'add');
      }
    } catch (error) {
      logger.error({ err: error, guildId: reaction.message.guild.id }, 'Reaction add error');
    }
  },
};

async function handleStarboard(reaction, user, settings) {
  const starboard = settings.starboard;

  // Check if this is the starboard emoji
  const starEmoji = starboard.emoji || '⭐';
  const isStarEmoji = reaction.emoji.name === starEmoji ||
    (reaction.emoji.id && reaction.emoji.id === starEmoji);

  if (!isStarEmoji) return;

  // Check threshold
  if (reaction.count < (starboard.threshold || 5)) return;

  // Check ignored channels
  if (starboard.ignoredChannels?.includes(reaction.message.channel.id)) return;

  // Check NSFW
  if (starboard.nsfwOnly && !reaction.message.channel.nsfw) return;

  // Check require image
  if (starboard.requireImage && reaction.message.attachments.size === 0 && !reaction.message.embeds.some(e => e.image || e.thumbnail)) return;

  // Check self-star
  if (!starboard.selfStar && reaction.message.author.id === user.id) return;

  // Check if already on starboard
  let entry = await StarboardEntry.findOne({
    guildId: reaction.message.guild.id,
    messageId: reaction.message.id,
  });

  const starboardChannel = reaction.message.guild.channels.cache.get(starboard.channel);
  if (!starboardChannel) return;

  if (entry) {
    // Update existing starboard entry
    entry.addStar(user.id);
    entry.starCount = reaction.count;

    // Update starboard message
    try {
      const starMessage = await starboardChannel.messages.fetch(entry.starboardMessageId);
      const embed = starMessage.embeds[0];
      if (embed) {
        const newEmbed = EmbedBuilder.from(embed)
          .setFields(embed.fields.map(f =>
            f.name.includes('Stars') ? { name: f.name, value: `${starEmoji} ${reaction.count}`, inline: f.inline } : f
          ));
        await starMessage.edit({ embeds: [newEmbed] });
      }
    } catch (e) {
      // Starboard message might have been deleted
      entry.markDeleted();
    }

    await entry.save();
  } else {
    // Create new starboard entry
    const content = reaction.message.content || '*No text content*';

    const embed = new EmbedBuilder()
      .setColor(COLORS.STARBOARD)
      .setAuthor({ name: reaction.message.author.tag, iconURL: reaction.message.author.displayAvatarURL({ dynamic: true }) })
      .setDescription(`${content}\n\n[Jump to message](${reaction.message.url})`)
      .addFields(
        { name: `${starEmoji} Stars`, value: reaction.count.toString(), inline: true },
        { name: 'Channel', value: `${reaction.message.channel}`, inline: true },
      )
      .setTimestamp(reaction.message.createdAt);

    if (reaction.message.attachments.size > 0) {
      const attachment = reaction.message.attachments.first();
      if (attachment.contentType?.startsWith('image/')) {
        embed.setImage(attachment.url);
      }
    }

    if (reaction.message.embeds.length > 0) {
      const firstEmbed = reaction.message.embeds[0];
      if (firstEmbed.image?.url) {
        embed.setImage(firstEmbed.image.url);
      } else if (firstEmbed.thumbnail?.url) {
        embed.setThumbnail(firstEmbed.thumbnail.url);
      }
    }

    const starMessage = await starboardChannel.send({ embeds: [embed] });

    entry = await StarboardEntry.create({
      guildId: reaction.message.guild.id,
      channelId: reaction.message.channel.id,
      messageId: reaction.message.id,
      starboardMessageId: starMessage.id,
      authorId: reaction.message.author.id,
      starCount: reaction.count,
      starredBy: [{ userId: user.id }],
      content: content.substring(0, 4000),
    });

    eventBus.emit(EVENTS.STARBOARD_ADD, { guildId: reaction.message.guild.id, entry });
  }
}

async function handleReactionRoles(reaction, user, settings, action) {
  // This would check if the message is a reaction role panel
  // and assign/remove the appropriate role
  // Implementation would check settings.reactionRoles.panels
  // For now, this is a placeholder
}