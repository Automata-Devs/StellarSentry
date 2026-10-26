/**
 * Role Update Event - Log role updates
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'roleUpdate',
  once: false,
  async execute(oldRole, newRole) {
    try {
      const settings = await guildService.getGuild(newRole.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.roleUpdate) return;

      const logChannel = newRole.guild.channels.cache.get(logging.channels.roleUpdate);
      if (!logChannel) return;

      const changes = [];

      if (oldRole.name !== newRole.name) {
        changes.push({ name: 'Name', value: `${oldRole.name} → ${newRole.name}`, inline: true });
      }
      if (oldRole.hexColor !== newRole.hexColor) {
        changes.push({ name: 'Color', value: `${oldRole.hexColor} → ${newRole.hexColor}`, inline: true });
      }
      if (oldRole.hoist !== newRole.hoist) {
        changes.push({ name: 'Hoisted', value: `${oldRole.hoist ? 'Yes' : 'No'} → ${newRole.hoist ? 'Yes' : 'No'}`, inline: true });
      }
      if (oldRole.mentionable !== newRole.mentionable) {
        changes.push({ name: 'Mentionable', value: `${oldRole.mentionable ? 'Yes' : 'No'} → ${newRole.mentionable ? 'Yes' : 'No'}`, inline: true });
      }
      if (oldRole.position !== newRole.position) {
        changes.push({ name: 'Position', value: `${oldRole.position} → ${newRole.position}`, inline: true });
      }
      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
        changes.push({ name: 'Permissions', value: 'Updated', inline: true });
      }

      if (changes.length === 0) return;

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.ROLE} Role Updated`)
        .setColor(COLORS.WARNING)
        .setDescription(`**${newRole.name}** was updated.`)
        .addFields(changes)
        .setTimestamp()
        .setFooter({ text: `Role ID: ${newRole.id}` });

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, guildId: newRole.guild.id }, 'Role update log error');
    }
  },
};