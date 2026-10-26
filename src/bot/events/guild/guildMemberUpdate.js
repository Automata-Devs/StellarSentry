/**
 * Guild Member Update Event - Log nickname, role, and timeout changes
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'guildMemberUpdate',
  once: false,
  async execute(oldMember, newMember) {
    if (!newMember.guild) return;

    try {
      const settings = await guildService.getGuild(newMember.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.memberUpdate) return;
      if (logging.ignoredChannels?.includes('memberUpdate')) return; // Not a channel, but conceptually

      const logChannel = newMember.guild.channels.cache.get(logging.channels.memberUpdate);
      if (!logChannel) return;

      // Nickname change
      if (oldMember.nickname !== newMember.nickname) {
        const embed = new EmbedBuilder()
          .setTitle('✏️ Nickname Changed')
          .setColor(COLORS.WARNING)
          .setDescription(`**${newMember.user.tag}** changed their nickname.`)
          .addFields(
            { name: 'Before', value: oldMember.nickname || '*No nickname*', inline: true },
            { name: 'After', value: newMember.nickname || '*No nickname*', inline: true },
          )
          .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp()
          .setFooter({ text: `User ID: ${newMember.id}` });

        await logChannel.send({ embeds: [embed] });
      }

      // Role changes
      const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

      if (addedRoles.size > 0 || removedRoles.size > 0) {
        const embed = new EmbedBuilder()
          .setTitle('🎭 Roles Updated')
          .setColor(addedRoles.size > 0 ? COLORS.SUCCESS : COLORS.ERROR)
          .setDescription(`**${newMember.user.tag}** roles were updated.`)
          .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp()
          .setFooter({ text: `User ID: ${newMember.id}` });

        if (addedRoles.size > 0) {
          embed.addFields({
            name: `Added (${addedRoles.size})`,
            value: addedRoles.map(r => r.toString()).join(', ').substring(0, 1024),
            inline: false,
          });
        }

        if (removedRoles.size > 0) {
          embed.addFields({
            name: `Removed (${removedRoles.size})`,
            value: removedRoles.map(r => r.toString()).join(', ').substring(0, 1024),
            inline: false,
          });
        }

        await logChannel.send({ embeds: [embed] });
      }

      // Timeout changes
      const wasTimedOut = oldMember.isCommunicationDisabled();
      const isTimedOut = newMember.isCommunicationDisabled();

      if (wasTimedOut !== isTimedOut) {
        const embed = new EmbedBuilder()
          .setTitle(isTimedOut ? '⏱️ Member Timed Out' : '⏱️ Timeout Removed')
          .setColor(isTimedOut ? COLORS.WARNING : COLORS.SUCCESS)
          .setDescription(`**${newMember.user.tag}** ${isTimedOut ? 'was timed out' : 'had their timeout removed'}.`)
          .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp()
          .setFooter({ text: `User ID: ${newMember.id}` });

        if (isTimedOut) {
          embed.addFields({
            name: 'Until',
            value: `<t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:R>`,
            inline: true,
          });
        }

        await logChannel.send({ embeds: [embed] });
      }
    } catch (error) {
      logger.error({ err: error, guildId: newMember.guild.id }, 'Guild member update log error');
    }
  },
};