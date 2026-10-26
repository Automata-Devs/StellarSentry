/**
 * Message Delete Bulk Event - Log bulk deleted messages
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'messageDeleteBulk',
  once: false,
  async execute(messages, channel) {
    if (!channel.guild) return;

    try {
      const settings = await guildService.getGuild(channel.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.messageDeleteBulk) return;

      const logChannel = channel.guild.channels.cache.get(logging.channels.messageDeleteBulk);
      if (!logChannel) return;

      // Filter out bot messages
      const userMessages = messages.filter(m => !m.author.bot);
      if (userMessages.size === 0) return;

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.DELETE} Bulk Message Delete`)
        .setColor(COLORS.ERROR)
        .setDescription(`**Channel:** ${channel}\n**Messages Deleted:** ${userMessages.size}`)
        .setTimestamp()
        .setFooter({ text: `Bulk delete in #${channel.name}` });

      // Show first few deleted messages
      const preview = userMessages.first(5).map(m =>
        `**${m.author.tag}:** ${m.content ? m.content.substring(0, 100) : '*No text content*'}`
      ).join('\n');

      if (preview) {
        embed.addFields({ name: 'Preview', value: preview, inline: false });
      }

      if (userMessages.size > 5) {
        embed.addFields({ name: 'Note', value: `...and ${userMessages.size - 5} more messages`, inline: false });
      }

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, guildId: channel.guild.id }, 'Bulk delete log error');
    }
  },
};