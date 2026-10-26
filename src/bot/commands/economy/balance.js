/**
 * Balance Command - Check your or another user's balance
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { economyService } from '../../services/economy.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your or another user\'s balance')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check balance for (defaults to yourself)')
        .setRequired(false)
    )
    .setNameLocalizations({ 'en-US': 'balance', 'en-GB': 'balance' })
    .setDescriptionLocalizations({ 'en-US': 'Check your or another user\'s balance' }),

  category: 'economy',
  cooldown: 5,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;

    const balance = await economyService.getBalance(interaction.guild.id, target.id);

    const embed = {
      title: `${EMOJIS.ECONOMY} ${target.username}'s Balance`,
      color: COLORS.ECONOMY,
      thumbnail: { url: target.displayAvatarURL({ dynamic: true }) },
      fields: [
        { name: 'Wallet', value: `${EMOJIS.ECONOMY} ${balance.wallet.toLocaleString()}`, inline: true },
        { name: 'Bank', value: `${EMOJIS.ECONOMY} ${balance.bank.toLocaleString()}`, inline: true },
        { name: 'Total', value: `${EMOJIS.ECONOMY} ${balance.total.toLocaleString()}`, inline: true },
      ],
      timestamp: new Date(),
      footer: { text: `StellarSentry Economy` },
    };

    await interaction.reply({ embeds: [embed] });
  },
};