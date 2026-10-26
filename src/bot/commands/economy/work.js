/**
 * Work Command - Work for money
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { economyService } from '../../services/economy.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn money'),

  category: 'economy',
  cooldown: 10,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const result = await economyService.work(interaction.guild.id, interaction.user.id);

      const embed = {
        title: `${EMOJIS.SUCCESS} Work Complete!`,
        color: COLORS.SUCCESS,
        description: `You worked as a **${result.job}** and earned **${EMOJIS.ECONOMY} ${result.amount.toLocaleString()}**!`,
        timestamp: new Date(),
        footer: { text: `StellarSentry Economy` },
      };

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} ${error.message}`,
      });
    }
  },
};