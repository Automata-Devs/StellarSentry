/**
 * Daily Command - Claim your daily reward
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { economyService } from '../../services/economy.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward'),

  category: 'economy',
  cooldown: 10,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const result = await economyService.claimDaily(interaction.guild.id, interaction.user.id);

      const embed = {
        title: `${EMOJIS.SUCCESS} Daily Reward Claimed!`,
        color: COLORS.SUCCESS,
        description: `You received **${EMOJIS.ECONOMY} ${result.amount.toLocaleString()}**!`,
        fields: [
          { name: 'Streak', value: `${result.streak} day${result.streak !== 1 ? 's' : ''}`, inline: true },
        ],
        timestamp: new Date(),
        footer: { text: `StellarSentry Economy` },
      };

      if (result.streakBonus > 0) {
        embed.fields.push({ name: 'Streak Bonus', value: `+${EMOJIS.ECONOMY} ${result.streakBonus.toLocaleString()}`, inline: true });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} ${error.message}`,
      });
    }
  },
};