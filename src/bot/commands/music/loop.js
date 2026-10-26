/**
 * Loop Command - Set loop mode
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { musicService } from '../../services/music.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set loop mode')
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' }
        )
    ),

  category: 'music',
  cooldown: 3,
  permissions: { user: [], bot: ['Connect', 'Speak', 'SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const mode = interaction.options.getString('mode');
    const player = musicService.getPlayer(interaction.guild.id);

    if (!player || !musicService.isPlaying(interaction.guild.id)) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Nothing is playing right now.`,
        ephemeral: true,
      });
    }

    await musicService.setLoop(interaction.guild.id, mode);

    const modeLabels = {
      off: 'Off',
      track: 'Track',
      queue: 'Queue',
    };

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.LOOP} Loop Mode`)
      .setColor(COLORS.SUCCESS)
      .setDescription(`Loop mode set to **${modeLabels[mode]}**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};