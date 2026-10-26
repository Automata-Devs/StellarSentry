/**
 * Buy Command - Buy an item from the shop
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { economyService } from '../../services/economy.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Item name or ID to buy')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('Quantity to buy (default: 1)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  category: 'economy',
  cooldown: 5,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const itemId = interaction.options.getString('item');
    const quantity = interaction.options.getInteger('quantity') || 1;

    await interaction.deferReply();

    try {
      const result = await economyService.buyItem(interaction.guild.id, interaction.user.id, itemId, quantity);

      const embed = {
        title: `${EMOJIS.SUCCESS} Purchase Successful!`,
        color: COLORS.SUCCESS,
        fields: [
          { name: 'Item', value: result.item, inline: true },
          { name: 'Quantity', value: result.quantity.toString(), inline: true },
          { name: 'Total Price', value: `${EMOJIS.ECONOMY} ${result.totalPrice.toLocaleString()}`, inline: true },
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

  async autocomplete(interaction, client) {
    const focused = interaction.options.getFocused(true);
    const shop = await economyService.getShop(interaction.guild.id);
    const visibleItems = shop.filter(item => !item.hidden);

    const choices = visibleItems
      .filter(item => item.name.toLowerCase().includes(focused.value.toLowerCase()) || item.itemId.toLowerCase().includes(focused.value.toLowerCase()))
      .slice(0, 25)
      .map(item => ({ name: `${item.emoji} ${item.name} (${EMOJIS.ECONOMY} ${item.price})`, value: item.itemId }));

    await interaction.respond(choices);
  },
};