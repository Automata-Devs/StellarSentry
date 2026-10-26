/**
 * Emoji Delete Event - Log emoji deletion
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'emojiDelete',
  once: false,
  async execute(emoji) {
    try {
      const settings = await guildService.getGuild(emoji.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.emojiDelete) return;

      const logChannel = emoji.guild.channels.cache.get(logging.channels.emojiDelete);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.INFO} Emoji Deleted`)
        .setColor(COLORS.ERROR)
        .setDescription(`**${emoji.name}** was deleted.`)
        .setThumbnail(emoji.url)
        .addFields(
          { name: 'ID', value: emoji.id, inline: true },
          { name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `Emoji ID: ${emoji.id}` });

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, guildId: emoji.guild.id }, 'Emoji delete log error');
    }
  },
};