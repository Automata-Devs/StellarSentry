/**
 * Pause Command - Pause the current track
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { musicService } from '../../services/music.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current track'),

  category: 'music',
  cooldown: 3,
  permissions: { user: [], bot: ['Connect', 'Speak', 'SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const player = musicService.getPlayer(interaction.guild.id);

    if (!player || !musicService.isPlaying(interaction.guild.id)) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Nothing is playing right now.`,
        ephemeral: true,
      });
    }

    if (player.paused) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} The player is already paused.`,
        ephemeral: true,
      });
    }

    await musicService.pause(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.PAUSE} Paused`)
      .setColor(COLORS.WARNING)
      .setDescription('Playback has been paused.')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};