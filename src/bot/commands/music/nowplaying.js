/**
 * NowPlaying Command - Show currently playing track
 */
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { musicService } from '../../services/music.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing track'),

  category: 'music',
  cooldown: 5,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const player = musicService.getPlayer(interaction.guild.id);

    if (!player || !musicService.isPlaying(interaction.guild.id)) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Nothing is playing right now.`,
        ephemeral: true,
      });
    }

    const current = musicService.getCurrentTrack(interaction.guild.id);

    if (!current) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} No track currently playing.`,
        ephemeral: true,
      });
    }

    const position = player.position || 0;
    const duration = current.info.length || 0;
    const progressBar = generateProgressBar(position, duration);

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.PLAY} Now Playing`)
      .setColor(COLORS.MUSIC)
      .setDescription(`[${current.info.title}](${current.info.uri})`)
      .addFields(
        { name: 'Author', value: current.info.author, inline: true },
        { name: 'Duration', value: `${progressBar} ${formatDuration(position)} / ${formatDuration(duration)}`, inline: false },
        { name: 'Requested by', value: current.requester ? `<@${current.requester}>` : 'Unknown', inline: true },
        { name: 'Volume', value: `${player.volume}%`, inline: true },
        { name: 'Loop', value: player.loop === 'off' ? 'Off' : player.loop === 'track' ? 'Track' : 'Queue', inline: true },
      )
      .setThumbnail(current.info.artworkUrl)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('music_pause').setLabel(player.paused ? '▶️' : '⏸️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_skip').setLabel('⏭️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_stop').setLabel('⏹️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('music_queue').setLabel('📋').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('music_loop').setLabel(getLoopEmoji(player.loop)).setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
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

function generateProgressBar(position, duration, length = 20) {
  if (!duration) return '░'.repeat(length);
  const percentage = Math.min(position / duration, 1);
  const filled = Math.round(percentage * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function getLoopEmoji(loop) {
  return loop === 'off' ? '🔁' : loop === 'track' ? '🔂' : '🔁';
}