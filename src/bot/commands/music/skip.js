/**
 * Skip Command - Skip the current track
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { musicService } from '../../services/music.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of tracks to skip (default: 1)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  category: 'music',
  cooldown: 3,
  permissions: { user: [], bot: ['Connect', 'Speak', 'SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const amount = interaction.options.getInteger('amount') || 1;
    const player = musicService.getPlayer(interaction.guild.id);

    if (!player || !musicService.isPlaying(interaction.guild.id)) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Nothing is playing right now.`,
        ephemeral: true,
      });
    }

    if (amount === 1) {
      await musicService.skip(interaction.guild.id);

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.SKIP} Skipped`)
        .setColor(COLORS.SUCCESS)
        .setDescription('Skipped the current track.')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else {
      // Skip multiple tracks by removing from queue
      const queue = musicService.getQueue(interaction.guild.id);
      if (queue && queue.size > 0) {
        const toRemove = Math.min(amount - 1, queue.size);
        for (let i = 0; i < toRemove; i++) {
          queue.remove(0);
        }
      }
      await musicService.skip(interaction.guild.id);

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.SKIP} Skipped ${amount} track${amount > 1 ? 's' : ''}`)
        .setColor(COLORS.SUCCESS)
        .setDescription(`Skipped ${amount} track${amount > 1 ? 's' : ''}.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};