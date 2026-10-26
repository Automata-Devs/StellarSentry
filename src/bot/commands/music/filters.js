/**
 * Filters Command - Apply audio filters
 */
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { musicService } from '../../services/music.service.js';

const FILTERS = [
  { id: 'bass', name: 'Bass Boost', emoji: '🔊', description: 'Enhance bass frequencies' },
  { id: 'nightcore', name: 'Nightcore', emoji: '⚡', description: 'Speed up and pitch up' },
  { id: 'vaporwave', name: 'Vaporwave', emoji: '🌊', description: 'Slow down and pitch down' },
  { id: 'eightD', name: '8D Audio', emoji: '🎧', description: 'Rotating audio effect' },
  { id: 'karaoke', name: 'Karaoke', emoji: '🎤', description: 'Remove vocals' },
  { id: 'clear', name: 'Clear Filters', emoji: '🧹', description: 'Remove all filters' },
];

export default {
  data: new SlashCommandBuilder()
    .setName('filters')
    .setDescription('Apply audio filters to the current track')
    .addStringOption(option =>
      option.setName('filter')
        .setDescription('Filter to apply')
        .setRequired(false)
        .addChoices(FILTERS.map(f => ({ name: f.name, value: f.id })))
    ),

  category: 'music',
  cooldown: 3,
  permissions: { user: [], bot: ['Connect', 'Speak', 'SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const filterId = interaction.options.getString('filter');
    const player = musicService.getPlayer(interaction.guild.id);

    if (!player || !musicService.isPlaying(interaction.guild.id)) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Nothing is playing right now.`,
        ephemeral: true,
      });
    }

    if (!filterId) {
      // Show filter selection menu
      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.INFO} Audio Filters`)
        .setColor(COLORS.MUSIC)
        .setDescription('Select a filter to apply:')
        .addFields(FILTERS.map(f => ({
          name: `${f.emoji} ${f.name}`,
          value: f.description,
          inline: true,
        })))
        .setTimestamp();

      const rows = [];
      for (let i = 0; i < FILTERS.length; i += 5) {
        const row = new ActionRowBuilder();
        for (let j = i; j < Math.min(i + 5, FILTERS.length); j++) {
          const f = FILTERS[j];
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`music_filter_${f.id}`)
              .setLabel(f.name)
              .setStyle(f.id === 'clear' ? ButtonStyle.Danger : ButtonStyle.Secondary)
              .setEmoji(f.emoji)
          );
        }
        rows.push(row);
      }

      return interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }

    // Apply filter
    const filter = FILTERS.find(f => f.id === filterId);

    if (filterId === 'clear') {
      await musicService.clearFilters(interaction.guild.id);

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.SUCCESS} Filters Cleared`)
        .setColor(COLORS.SUCCESS)
        .setDescription('All audio filters have been removed.')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else {
      await musicService.setFilters(interaction.guild.id, { [filterId]: true });

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.SUCCESS} Filter Applied`)
        .setColor(COLORS.SUCCESS)
        .setDescription(`${filter.emoji} **${filter.name}** filter has been applied.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};