/**
 * Seek Command - Seek to a position in the current track
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { musicService } from '../../services/music.service.js';
import { parseTime } from '../../utils/time.js';

export default {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek to a position in the current track')
    .addStringOption(option =>
      option.setName('position')
        .setDescription('Position to seek to (e.g., 1:30, 2m, 90s)')
        .setRequired(true)
    ),

  category: 'music',
  cooldown: 3,
  permissions: { user: [], bot: ['Connect', 'Speak', 'SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const positionStr = interaction.options.getString('position');
    const player = musicService.getPlayer(interaction.guild.id);

    if (!player || !musicService.isPlaying(interaction.guild.id)) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Nothing is playing right now.`,
        ephemeral: true,
      });
    }

    const current = musicService.getCurrentTrack(interaction.guild.id);
    if (!current || !current.info.isSeekable) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} This track cannot be seeked (livestream).`,
        ephemeral: true,
      });
    }

    // Parse position
    let positionMs;
    const parsed = parseTime(positionStr);
    if (parsed) {
      positionMs = parsed;
    } else {
      // Try parsing as mm:ss or hh:mm:ss
      const parts = positionStr.split(':').map(Number);
      if (parts.length === 2) {
        positionMs = (parts[0] * 60 + parts[1]) * 1000;
      } else if (parts.length === 3) {
        positionMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
      } else {
        return interaction.reply({
          content: `${EMOJIS.ERROR} Invalid position format. Use mm:ss, hh:mm:ss, or time like 1m30s.`,
          ephemeral: true,
        });
      }
    }

    // Validate position
    if (positionMs < 0) positionMs = 0;
    if (positionMs > current.info.length) positionMs = current.info.length;

    await musicService.seek(interaction.guild.id, positionMs);

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.INFO} Seeked`)
      .setColor(COLORS.SUCCESS)
      .setDescription(`Seeked to **${formatDuration(positionMs)}**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

function formatDuration(ms) {
  if (!ms) return '0:00';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}