/**
 * Role Create Event - Log role creation
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'roleCreate',
  once: false,
  async execute(role) {
    try {
      const settings = await guildService.getGuild(role.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.roleCreate) return;

      const logChannel = role.guild.channels.cache.get(logging.channels.roleCreate);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.ROLE} Role Created`)
        .setColor(COLORS.SUCCESS)
        .setDescription(`**${role.name}** was created.`)
        .addFields(
          { name: 'ID', value: role.id, inline: true },
          { name: 'Color', value: role.hexColor, inline: true },
          { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
          { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
          { name: 'Position', value: role.position.toString(), inline: true },
          { name: 'Managed', value: role.managed ? 'Yes' : 'No', inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `Role ID: ${role.id}` });

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, guildId: role.guild.id }, 'Role create log error');
    }
  },
};