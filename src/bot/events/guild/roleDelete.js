/**
 * Role Delete Event - Log role deletion
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'roleDelete',
  once: false,
  async execute(role) {
    try {
      const settings = await guildService.getGuild(role.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.roleDelete) return;

      const logChannel = role.guild.channels.cache.get(logging.channels.roleDelete);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.ROLE} Role Deleted`)
        .setColor(COLORS.ERROR)
        .setDescription(`**${role.name}** was deleted.`)
        .addFields(
          { name: 'ID', value: role.id, inline: true },
          { name: 'Color', value: role.hexColor, inline: true },
          { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
          { name: 'Position', value: role.position.toString(), inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `Role ID: ${role.id}` });

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, guildId: role.guild.id }, 'Role delete log error');
    }
  },
};