/**
 * Pay Command - Transfer money to another user
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { economyService } from '../../services/economy.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfer money to another user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to pay')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount to transfer')
        .setRequired(true)
        .setMinValue(1)
    ),

  category: 'economy',
  cooldown: 5,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (target.bot) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} You cannot pay a bot!`,
        ephemeral: true,
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} You cannot pay yourself!`,
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      await economyService.transfer(interaction.guild.id, interaction.user.id, target.id, amount);

      const embed = {
        title: `${EMOJIS.SUCCESS} Payment Sent!`,
        color: COLORS.SUCCESS,
        fields: [
          { name: 'From', value: `${interaction.user}`, inline: true },
          { name: 'To', value: `${target}`, inline: true },
          { name: 'Amount', value: `${EMOJIS.ECONOMY} ${amount.toLocaleString()}`, inline: true },
        ],
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