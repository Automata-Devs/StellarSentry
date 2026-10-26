/**
 * Emoji Create Event - Log emoji creation
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'emojiCreate',
  once: false,
  async execute(emoji) {
    try {
      const settings = await guildService.getGuild(emoji.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.emojiCreate) return;

      const logChannel = emoji.guild.channels.cache.get(logging.channels.emojiCreate);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.INFO} Emoji Created`)
        .setColor(COLORS.SUCCESS)
        .setDescription(`**${emoji.name}** was created.`)
        .setThumbnail(emoji.url)
        .addFields(
          { name: 'ID', value: emoji.id, inline: true },
          { name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true },
          { name: 'Managed', value: emoji.managed ? 'Yes' : 'No', inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `Emoji ID: ${emoji.id}` });

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, guildId: emoji.guild.id }, 'Emoji create log error');
    }
  },
};