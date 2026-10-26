/**
 * Emoji Update Event - Log emoji updates
 */
import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { guildService } from '../../../services/guild.service.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'emojiUpdate',
  once: false,
  async execute(oldEmoji, newEmoji) {
    try {
      const settings = await guildService.getGuild(newEmoji.guild.id);
      const logging = settings?.logging || {};

      if (!logging.enabled || !logging.channels?.emojiUpdate) return;

      const logChannel = newEmoji.guild.channels.cache.get(logging.channels.emojiUpdate);
      if (!logChannel) return;

      const changes = [];

      if (oldEmoji.name !== newEmoji.name) {
        changes.push({ name: 'Name', value: `${oldEmoji.name} → ${newEmoji.name}`, inline: true });
      }

      if (changes.length === 0) return;

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.INFO} Emoji Updated`)
        .setColor(COLORS.WARNING)
        .setDescription(`**${newEmoji.name}** was updated.`)
        .setThumbnail(newEmoji.url)
        .addFields(changes)
        .setTimestamp()
        .setFooter({ text: `Emoji ID: ${newEmoji.id}` });

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error, guildId: newEmoji.guild.id }, 'Emoji update log error');
    }
  },
};