/**
 * Volume Command - Set the playback volume
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { musicService } from '../../services/music.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the playback volume')
    .addIntegerOption(option =>
      option.setName('level')
        .setDescription(`Volume level (0-${LIMITS.MUSIC_VOLUME_MAX})`)
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(LIMITS.MUSIC_VOLUME_MAX)
    ),

  category: 'music',
  cooldown: 3,
  permissions: { user: [], bot: ['Connect', 'Speak', 'SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const level = interaction.options.getInteger('level');
    const player = musicService.getPlayer(interaction.guild.id);

    if (!player || !musicService.isPlaying(interaction.guild.id)) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Nothing is playing right now.`,
        ephemeral: true,
      });
    }

    await musicService.setVolume(interaction.guild.id, level);

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.VOLUME} Volume Set`)
      .setColor(COLORS.SUCCESS)
      .setDescription(`Volume set to **${level}%**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};