/**
 * Stop Command - Stop playback and clear queue
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { musicService } from '../../services/music.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),

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

    await musicService.stop(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.STOP} Stopped`)
      .setColor(COLORS.ERROR)
      .setDescription('Playback stopped and queue cleared.')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};