/**
 * Guild Member Add Event - Handle welcome messages and auto-roles
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    try {
      const settings = await guildService.getGuild(member.guild.id);
      const welcome = settings?.welcome || {};

      if (!welcome.enabled) return;

      // Auto-roles
      if (welcome.autoRoles?.length) {
        const roles = welcome.autoRoles
          .map(id => member.guild.roles.cache.get(id))
          .filter(Boolean);

        if (roles.length > 0) {
          try {
            await member.roles.add(roles);
          } catch (e) {
            logger.warn({ err: e, guildId: member.guild.id }, 'Failed to add auto-roles');
          }
        }
      }

      // Welcome message
      if (welcome.channel) {
        const channel = member.guild.channels.cache.get(welcome.channel);
        if (channel) {
          const memberCount = member.guild.memberCount;
          const replacePlaceholders = (text) => text
            .replace('{user}', member.toString())
            .replace('{user.tag}', member.user.tag)
            .replace('{user.id}', member.user.id)
            .replace('{server}', member.guild.name)
            .replace('{memberCount}', memberCount.toString())
            .replace('{memberCount.ordinal}', toOrdinal(memberCount));

          if (welcome.embed?.enabled) {
            const embed = new EmbedBuilder()
              .setTitle(replacePlaceholders(welcome.embed.title || 'Welcome!'))
              .setDescription(replacePlaceholders(welcome.embed.description || `Welcome {user} to {server}!`))
              .setColor(welcome.embed.color || COLORS.PRIMARY)
              .setTimestamp();

            if (welcome.embed.thumbnail) {
              embed.setThumbnail(replacePlaceholders(welcome.embed.thumbnail));
            } else {
              embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
            }

            if (welcome.embed.image) {
              embed.setImage(replacePlaceholders(welcome.embed.image));
            }

            if (welcome.embed.footer) {
              embed.setFooter({ text: replacePlaceholders(welcome.embed.footer) });
            }

            await channel.send({
              content: welcome.embed.mentionUser ? member.toString() : undefined,
              embeds: [embed],
            });
          } else {
            const message = replacePlaceholders(welcome.message || 'Welcome {user} to {server}! We now have {memberCount} members.');
            await channel.send({ content: message });
          }
        }
      }

      // Log join if logging enabled
      if (settings?.logging?.enabled && settings.logging.channels?.memberJoin) {
        await logMemberJoin(member, settings);
      }
    } catch (error) {
      logger.error({ err: error, guildId: member.guild.id }, 'Guild member add error');
    }
  },
};

async function logMemberJoin(member, settings) {
  const logging = settings.logging;
  if (!logging.enabled || !logging.channels?.memberJoin) return;

  const logChannel = member.guild.channels.cache.get(logging.channels.memberJoin);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setTitle('👋 Member Joined')
    .setColor(COLORS.SUCCESS)
    .setDescription(`**${member.user.tag}** joined the server.`)
    .addFields(
      { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
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