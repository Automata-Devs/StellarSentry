/**
 * Guild Ban Add Event - Log bans
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'guildBanAdd',
  once: false,
  async execute(ban) {
    try {
      const settings = await guildService.getGuild(ban.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.memberBan) return;

      const logChannel = ban.guild.channels.cache.get(logging.channels.memberBan);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.ERROR} Member Banned`)
        .setColor(COLORS.ERROR)
        .setDescription(`**${ban.user.tag}** was banned.`)
        .addFields(
          { name: 'User', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
          { name: 'Reason', value: ban.reason || 'No reason provided', inline: false },
        )
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: `User ID: ${ban.user.id}` });

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, guildId: ban.guild.id }, 'Ban add log error');
    }
  },
};