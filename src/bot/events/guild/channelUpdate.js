/**
 * Channel Update Event - Log channel updates
 */
import { EmbedBuilder, ChannelType } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'channelUpdate',
  once: false,
  async execute(oldChannel, newChannel) {
    if (!newChannel.guild) return;

    try {
      const settings = await guildService.getGuild(newChannel.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.channelUpdate) return;

      const logChannel = newChannel.guild.channels.cache.get(logging.channels.channelUpdate);
      if (!logChannel) return;

      const changes = [];

      if (oldChannel.name !== newChannel.name) {
        changes.push({ name: 'Name', value: `${oldChannel.name} → ${newChannel.name}`, inline: true });
      }
      if (oldChannel.topic !== newChannel.topic) {
        changes.push({ name: 'Topic', value: `Updated`, inline: true });
      }
      if (oldChannel.nsfw !== newChannel.nsfw) {
        changes.push({ name: 'NSFW', value: `${oldChannel.nsfw ? 'Yes' : 'No'} → ${newChannel.nsfw ? 'Yes' : 'No'}`, inline: true });
      }
      if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        changes.push({ name: 'Slowmode', value: `${oldChannel.rateLimitPerUser}s → ${newChannel.rateLimitPerUser}s`, inline: true });
      }
      if (oldChannel.parentId !== newChannel.parentId) {
        const oldParent = oldChannel.guild.channels.cache.get(oldChannel.parentId);
        const newParent = newChannel.guild.channels.cache.get(newChannel.parentId);
        changes.push({ name: 'Category', value: `${oldParent?.name || 'None'} → ${newParent?.name || 'None'}`, inline: true });
      }

      if (changes.length === 0) return;

      const typeLabels = {
        [ChannelType.GuildText]: 'Text Channel',
        [ChannelType.GuildVoice]: 'Voice Channel',
        [ChannelType.GuildCategory]: 'Category',
        [ChannelType.GuildAnnouncement]: 'Announcement Channel',
        [ChannelType.GuildStageVoice]: 'Stage Channel',
        [ChannelType.GuildForum]: 'Forum Channel',
      };

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.CHANNEL} Channel Updated`)
        .setColor(COLORS.WARNING)
        .setDescription(`**${newChannel.name}** (${typeLabels[newChannel.type] || 'Channel'}) was updated.`)
        .addFields(changes)
        .setTimestamp()
        .setFooter({ text: `Channel ID: ${newChannel.id}` });

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, guildId: newChannel.guild.id }, 'Channel update log error');
    }
  },
};