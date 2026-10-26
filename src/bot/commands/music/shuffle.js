/**
 * Shuffle Command - Shuffle the queue
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { musicService } from '../../services/music.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the music queue'),

  category: 'music',
  cooldown: 3,
  permissions: { user: [], bot: ['Connect', 'Speak', 'SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const player = musicService.getPlayer(interaction.guild.id);
    const queue = musicService.getQueue(interaction.guild.id);

    if (!player || !queue || queue.size < 2) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Queue must have at least 2 tracks to shuffle.`,
        ephemeral: true,
      });
    }

    await musicService.shuffle(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.SHUFFLE} Queue Shuffled`)
      .setColor(COLORS.SUCCESS)
      .setDescription(`Shuffled **${queue.size}** tracks in the queue.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};