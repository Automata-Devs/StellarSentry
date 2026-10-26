/**
 * Play Command - Play music from various sources
 */
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { musicService } from '../../services/music.service.js';
import { guildService } from '../../services/guild.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play music from YouTube, SoundCloud, or direct links')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Song name, URL, or search query')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option.setName('source')
        .setDescription('Source to search')
        .setRequired(false)
        .addChoices(
          { name: 'YouTube', value: 'ytsearch' },
          { name: 'YouTube Music', value: 'ytmsearch' },
          { name: 'SoundCloud', value: 'scsearch' },
          { name: 'Spotify', value: 'spsearch' },
        )
    ),

  category: 'music',
  cooldown: 5,
  permissions: { user: [], bot: ['Connect', 'Speak', 'SendMessages', 'EmbedLinks', 'UseVoiceActivation'] },
  guildOnly: true,

  async execute(interaction, client) {
    const query = interaction.options.getString('query');
    const source = interaction.options.getString('source') || 'ytsearch';

    const settings = await guildService.getGuild(interaction.guild.id);
    const musicSettings = settings?.music || {};

    if (!musicSettings.enabled) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} The music system is not enabled for this server.`,
        ephemeral: true,
      });
    }

    // Check voice channel
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} You must be in a voice channel to use this command.`,
        ephemeral: true,
      });
    }

    // Check bot permissions
    const permissions = voiceChannel.permissionsFor(client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} I don't have permission to join/speak in that voice channel.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      // Search for tracks
      const tracks = await musicService.search(query, source);

      if (!tracks.length) {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} No results found for your query.`,
        });
      }

      const track = tracks[0];

      // Check if there's already a player
      const existingPlayer = musicService.getPlayer(interaction.guild.id);
      const isPlaying = existingPlayer && musicService.isPlaying(interaction.guild.id);

      if (isPlaying) {
        // Add to queue
        await musicService.addToQueue(interaction.guild.id, track);

        const embed = new EmbedBuilder()
          .setTitle(`${EMOJIS.QUEUE} Added to Queue`)
          .setColor(COLORS.SUCCESS)
          .setDescription(`**${track.info.title}** by **${track.info.author}**`)
          .addFields(
            { name: 'Duration', value: formatDuration(track.info.length), inline: true },
            { name: 'Requested by', value: `${interaction.user}`, inline: true },
            { name: 'Position in Queue', value: `#${existingPlayer.queue.size}`, inline: true },
          )
          .setThumbnail(track.info.artworkUrl)
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      // Play immediately
      await musicService.play({
        guildId: interaction.guild.id,
        voiceChannelId: voiceChannel.id,
        textChannelId: interaction.channel.id,
        track,
        requesterId: interaction.user.id,
      });

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.PLAY} Now Playing`)
        .setColor(COLORS.SUCCESS)
        .setDescription(`**${track.info.title}** by **${track.info.author}**`)
        .addFields(
          { name: 'Duration', value: formatDuration(track.info.length), inline: true },
          { name: 'Requested by', value: `${interaction.user}`, inline: true },
          { name: 'Source', value: track.info.sourceName || 'Unknown', inline: true },
        )
        .setThumbnail(track.info.artworkUrl)
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('music_pause').setLabel('⏸️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_skip').setLabel('⏭️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_stop').setLabel('⏹️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('music_queue').setLabel('📋').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('music_volume').setLabel('🔊').setStyle(ButtonStyle.Secondary),
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to play: ${error.message}`,
      });
    }
  },

  async autocomplete(interaction, client) {
    const focused = interaction.options.getFocused();
    if (focused.length < 2) {
      return interaction.respond([
        { name: 'Enter a song name or URL...', value: '' },
      ]);
    }

    // Don't do actual search in autocomplete (too slow), just suggest
    await interaction.respond([
      { name: `Search YouTube: ${focused}`, value: focused },
      { name: `Search SoundCloud: ${focused}`, value: focused },
    ].slice(0, 25));
  },
};

function formatDuration(ms) {
  if (!ms) return 'Unknown';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}