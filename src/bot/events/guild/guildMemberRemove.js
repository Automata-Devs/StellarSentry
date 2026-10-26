/**
 * Guild Member Remove Event - Handle leave messages and logging
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'guildMemberRemove',
  once: false,
  async execute(member) {
    try {
      const settings = await guildService.getGuild(member.guild.id);
      const leave = settings?.leave || {};

      // Leave message
      if (leave.enabled && leave.channel) {
        const channel = member.guild.channels.cache.get(leave.channel);
        if (channel) {
          const memberCount = member.guild.memberCount;
          const replacePlaceholders = (text) => text
            .replace('{user}', member.toString())
            .replace('{user.tag}', member.user.tag)
            .replace('{user.id}', member.user.id)
            .replace('{server}', member.guild.name)
            .replace('{memberCount}', memberCount.toString())
            .replace('{memberCount.ordinal}', toOrdinal(memberCount));

          if (leave.embed?.enabled) {
            const embed = new EmbedBuilder()
              .setTitle(replacePlaceholders(leave.embed.title || 'Goodbye!'))
              .setDescription(replacePlaceholders(leave.embed.description || '{user} has left {server}.'))
              .setColor(leave.embed.color || COLORS.ERROR)
              .setTimestamp();

            if (leave.embed.thumbnail) {
              embed.setThumbnail(replacePlaceholders(leave.embed.thumbnail));
            } else {
              embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
            }

            if (leave.embed.footer) {
              embed.setFooter({ text: replacePlaceholders(leave.embed.footer) });
            }

            await channel.send({ embeds: [embed] });
          } else {
            const message = replacePlaceholders(leave.message || '{user} has left {server}. We now have {memberCount} members.');
            await channel.send({ content: message });
          }
        }
      }

      // Log leave if logging enabled
      if (settings?.logging?.enabled && settings.logging.channels?.memberLeave) {
        await logMemberLeave(member, settings);
      }
    } catch (error) {
      logger.error({ err: error, guildId: member.guild.id }, 'Guild member remove error');
    }
  },
};

async function logMemberLeave(member, settings) {
  const logging = settings.logging;
  if (!logging.enabled || !logging.channels?.memberLeave) return;

  const logChannel = member.guild.channels.cache.get(logging.channels.memberLeave);
  if (!logChannel) return;

  const roles = member.roles.cache
    .filter(r => r.id !== member.guild.id)
    .map(r => r.toString())
    .join(', ') || 'None';

  const embed = new EmbedBuilder()
    .setTitle('👋 Member Left')
    .setColor(COLORS.ERROR)
    .setDescription(`**${member.user.tag}** left the server.`)
    .addFields(
      { name: 'Roles', value: roles.length > 1024 ? roles.substring(0, 1021) + '...' : roles, inline: false },
      { name: 'Member Count', value: member.guild.memberCount.toString(), inline: true },
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp()
    .setFooter({ text: `User ID: ${member.id}` });

  await logChannel.send({ embeds: [embed] });
}

function toOrdinal(num) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}