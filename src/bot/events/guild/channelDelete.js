/**
 * Channel Delete Event - Log channel deletion
 */
import { EmbedBuilder, ChannelType } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'channelDelete',
  once: false,
  async execute(channel) {
    if (!channel.guild) return;

    try {
      const settings = await guildService.getGuild(channel.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.channelDelete) return;

      const logChannel = channel.guild.channels.cache.get(logging.channels.channelDelete);
      if (!logChannel) return;

      const typeLabels = {
        [ChannelType.GuildText]: 'Text Channel',
        [ChannelType.GuildVoice]: 'Voice Channel',
        [ChannelType.GuildCategory]: 'Category',
        [ChannelType.GuildAnnouncement]: 'Announcement Channel',
        [ChannelType.GuildStageVoice]: 'Stage Channel',
        [ChannelType.GuildForum]: 'Forum Channel',
      };

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.CHANNEL} Channel Deleted`)
        .setColor(COLORS.ERROR)
        .setDescription(`**${channel.name}** (${typeLabels[channel.type] || 'Channel'}) was deleted.`)
        .addFields(
          { name: 'ID', value: channel.id, inline: true },
          { name: 'Type', value: typeLabels[channel.type] || 'Unknown', inline: true },
          { name: 'NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `Channel ID: ${channel.id}` });

      if (channel.parent) {
        embed.addFields({ name: 'Category', value: channel.parent.name, inline: true });
      }

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, guildId: channel.guild.id }, 'Channel delete log error');
    }
  },
};