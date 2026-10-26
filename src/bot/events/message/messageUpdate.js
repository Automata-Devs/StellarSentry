/**
 * Message Update Event - Log edited messages
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'messageUpdate',
  once: false,
  async execute(oldMessage, newMessage) {
    // Ignore partials, bots, DMs, and embed-only changes
    if (oldMessage.partial || newMessage.partial || newMessage.author.bot || !newMessage.guild) return;
    if (oldMessage.content === newMessage.content && oldMessage.embeds.length === newMessage.embeds.length) return;

    try {
      const settings = await guildService.getGuild(newMessage.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.messageEdit) return;
      if (logging.ignoredChannels?.includes(newMessage.channel.id)) return;
      if (logging.ignoredRoles?.some(r => newMessage.member.roles.cache.has(r))) return;

      const logChannel = newMessage.guild.channels.cache.get(logging.channels.messageEdit);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.EDIT} Message Edited`)
        .setColor(COLORS.WARNING)
        .setDescription(`**Channel:** ${newMessage.channel}\n**Author:** ${newMessage.author.tag} (${newMessage.author.id})`)
        .setURL(newMessage.url)
        .setThumbnail(newMessage.author.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: `Message ID: ${newMessage.id}` });

      if (oldMessage.content !== newMessage.content) {
        embed.addFields(
          { name: 'Before', value: oldMessage.content ? oldMessage.content.substring(0, 1024) : '*No text content*', inline: false },
          { name: 'After', value: newMessage.content ? newMessage.content.substring(0, 1024) : '*No text content*', inline: false },
        );
      }

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, guildId: newMessage.guild.id }, 'Message edit log error');
    }
  },
};