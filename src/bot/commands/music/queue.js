/**
 * Queue Command - View the music queue
 */
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { musicService } from '../../services/music.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the music queue'),

  category: 'music',
  cooldown: 5,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const player = musicService.getPlayer(interaction.guild.id);

    if (!player) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} No active player in this server.`,
        ephemeral: true,
      });
    }

    const queue = musicService.getQueue(interaction.guild.id);
    const current = musicService.getCurrentTrack(interaction.guild.id);

    if (!current && (!queue || queue.size === 0)) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} The queue is empty.`,
        ephemeral: true,
      });
    }

    // Pagination
    let page = 0;
    const perPage = 10;
    const queueArray = queue ? Array.from(queue) : [];
    const totalPages = Math.max(1, Math.ceil(queueArray.length / perPage));

    const generateEmbed = (pageIndex) => {
      const start = pageIndex * perPage;
      const end = start + perPage;
      const pageTracks = queueArray.slice(start, end);

      let description = '';

      if (current) {
        const position = player.position || 0;
        const duration = current.info.length || 0;
        const progressBar = generateProgressBar(position, duration);
        description += `**Now Playing:** [${current.info.title}](${current.info.uri})\n`;
        description += `by **${current.info.author}** ${progressBar} ${formatDuration(position)} / ${formatDuration(duration)}\n\n`;
      }

      if (pageTracks.length > 0) {
        description += pageTracks.map((track, i) => {
          return `${start + i + 1}. [${track.info.title}](${track.info.uri}) — **${track.info.author}** (${formatDuration(track.info.length)})`;
        }).join('\n');
      } else if (!current) {
        description = 'Queue is empty.';
      }

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.QUEUE} Music Queue`)
        .setColor(COLORS.MUSIC)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: `Page ${pageIndex + 1} of ${totalPages} • ${queueArray.length} tracks • ${formatDuration(queue.duration || 0)}` });

      return embed;
    };

    const generateButtons = (pageIndex) => {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('queue_first').setLabel('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === 0),
        new ButtonBuilder().setCustomId('queue_prev').setLabel('◀️').setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === 0),
        new ButtonBuilder().setCustomId('queue_next').setLabel('▶️').setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === totalPages - 1),
        new ButtonBuilder().setCustomId('queue_last').setLabel('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === totalPages - 1),
      );
      return row;
    };

    const reply = await interaction.reply({
      embeds: [generateEmbed(page)],
      components: totalPages > 1 ? [generateButtons(page)] : [],
      fetchReply: true,
    });

    if (totalPages <= 1) return;

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async i => {
      switch (i.customId) {
        case 'queue_first':
          page = 0;
          break;
        case 'queue_prev':
          page = Math.max(0, page - 1);
          break;
        case 'queue_next':
          page = Math.min(totalPages - 1, page + 1);
          break;
        case 'queue_last':
          page = totalPages - 1;
          break;
      }
      await i.update({ embeds: [generateEmbed(page)], components: [generateButtons(page)] });
    });

    collector.on('end', async () => {
      const disabledButtons = generateButtons(page).components.map(btn => ButtonBuilder.from(btn).setDisabled(true));
      await interaction.editReply({ components: [new ActionRowBuilder().addComponents(disabledButtons)] }).catch(() => {});
    });
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

function generateProgressBar(position, duration, length = 15) {
  if (!duration) return '░'.repeat(length);
  const percentage = Math.min(position / duration, 1);
  const filled = Math.round(percentage * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}