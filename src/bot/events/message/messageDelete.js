/**
 * Message Delete Event - Log deleted messages
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'messageDelete',
  once: false,
  async execute(message) {
    // Ignore partials, bots, DMs
    if (message.partial || message.author.bot || !message.guild) return;

    try {
      const settings = await guildService.getGuild(message.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.messageDelete) return;
      if (logging.ignoredChannels?.includes(message.channel.id)) return;
      if (logging.ignoredRoles?.some(r => message.member.roles.cache.has(r))) return;

      const logChannel = message.guild.channels.cache.get(logging.channels.messageDelete);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.DELETE} Message Deleted`)
        .setColor(COLORS.ERROR)
        .setDescription(`**Channel:** ${message.channel}\n**Author:** ${message.author.tag} (${message.author.id})`)
        .addFields(
          { name: 'Content', value: message.content ? message.content.substring(0, 1024) : '*No text content*', inline: false },
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: `Message ID: ${message.id}` });

      if (message.attachments.size > 0) {
        embed.addFields({ name: 'Attachments', value: message.attachments.map(a => a.url).join('\n').substring(0, 1024), inline: false });
      }

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, guildId: message.guild.id }, 'Message delete log error');
    }
  },
};