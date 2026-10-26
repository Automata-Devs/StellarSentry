/**
 * Music Button Handlers
 */
import { ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { musicService } from '../../../services/music.service.js';

/**
 * Create music control buttons
 */
export function createMusicControlButtons(player) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_pause')
      .setLabel(player.paused ? '▶️' : '⏸️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setLabel('⏭️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setLabel('⏹️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('music_queue')
      .setLabel('📋')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('music_volume')
      .setLabel('🔊')
      .setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Create music loop button
 */
export function createMusicLoopButton(loopMode) {
  const labels = { off: '🔁', track: '🔂', queue: '🔁' };
  return new ButtonBuilder()
    .setCustomId('music_loop')
    .setLabel(labels[loopMode] || '🔁')
    .setStyle(ButtonStyle.Secondary);
}

/**
 * Handle music pause/resume button
 */
export async function handleMusicPause(interaction, client) {
  const player = musicService.getPlayer(interaction.guild.id);

  if (!player || !musicService.isPlaying(interaction.guild.id)) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} Nothing is playing.`,
      ephemeral: true,
    });
  }

  if (player.paused) {
    await musicService.resume(interaction.guild.id);
  } else {
    await musicService.pause(interaction.guild.id);
  }

  // Update buttons
  const updatedPlayer = musicService.getPlayer(interaction.guild.id);
  const row = createMusicControlButtons(updatedPlayer);

  await interaction.update({ components: [row] });
}

/**
 * Handle music skip button
 */
export async function handleMusicSkip(interaction, client) {
  const player = musicService.getPlayer(interaction.guild.id);

  if (!player || !musicService.isPlaying(interaction.guild.id)) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} Nothing is playing.`,
      ephemeral: true,
    });
  }

  await musicService.skip(interaction.guild.id);
  await interaction.reply({ content: `${EMOJIS.SKIP} Skipped!`, ephemeral: true });
}

/**
 * Handle music stop button
 */
export async function handleMusicStop(interaction, client) {
  const player = musicService.getPlayer(interaction.guild.id);

  if (!player || !musicService.isPlaying(interaction.guild.id)) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} Nothing is playing.`,
      ephemeral: true,
    });
  }

  await musicService.stop(interaction.guild.id);
  await interaction.reply({ content: `${EMOJIS.STOP} Stopped and queue cleared!`, ephemeral: true });
}

/**
 * Handle music queue button
 */
export async function handleMusicQueue(interaction, client) {
  const queue = musicService.getQueue(interaction.guild.id);
  const current = musicService.getCurrentTrack(interaction.guild.id);

  if (!current && (!queue || queue.size === 0)) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} The queue is empty.`,
      ephemeral: true,
    });
  }

  // This would show the queue - simplified for now
  const queueArray = queue ? Array.from(queue) : [];
  const description = queueArray.slice(0, 10).map((track, i) =>
    `${i + 1}. ${track.info.title} — ${track.info.author}`
  ).join('\n') || 'Queue is empty';

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.QUEUE} Music Queue`)
    .setColor(COLORS.MUSIC)
    .setDescription(description)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Handle music loop button
 */
export async function handleMusicLoop(interaction, client) {
  const player = musicService.getPlayer(interaction.guild.id);

  if (!player || !musicService.isPlaying(interaction.guild.id)) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} Nothing is playing.`,
      ephemeral: true,
    });
  }

  const modes = ['off', 'track', 'queue'];
  const currentIndex = modes.indexOf(player.loop);
  const nextMode = modes[(currentIndex + 1) % modes.length];

  await musicService.setLoop(interaction.guild.id, nextMode);

  const row = createMusicControlButtons(player);
  row.components[4] = createMusicLoopButton(nextMode);

  await interaction.update({ components: [row] });
}

/**
 * Handle music volume button (opens modal for volume input)
 */
export async function handleMusicVolume(interaction, client) {
  // This would open a modal for volume input
  // For now, just reply
  await interaction.reply({
    content: 'Use `/volume <0-200>` to set volume.',
    ephemeral: true,
  });
}

/**
 * Register music button handlers
 */
export function registerMusicButtons(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    switch (interaction.customId) {
      case 'music_pause':
        await handleMusicPause(interaction, client);
        break;
      case 'music_skip':
        await handleMusicSkip(interaction, client);
        break;
      case 'music_stop':
        await handleMusicStop(interaction, client);
        break;
      case 'music_queue':
        await handleMusicQueue(interaction, client);
        break;
      case 'music_volume':
        await handleMusicVolume(interaction, client);
        break;
      case 'music_loop':
        await handleMusicLoop(interaction, client);
        break;
    }
  });
}