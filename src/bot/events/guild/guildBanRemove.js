/**
 * Guild Ban Remove Event - Log unbans
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'guildBanRemove',
  once: false,
  async execute(ban) {
    try {
      const settings = await guildService.getGuild(ban.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.memberUnban) return;

      const logChannel = ban.guild.channels.cache.get(logging.channels.memberUnban);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.SUCCESS} Member Unbanned`)
        .setColor(COLORS.SUCCESS)
        .setDescription(`**${ban.user.tag}** was unbanned.`)
        .addFields(
          { name: 'User', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
        )
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: `User ID: ${ban.user.id}` });

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, guildId: ban.guild.id }, 'Ban remove log error');
    }
  },
};