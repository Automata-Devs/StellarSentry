/**
 * Inventory Command - View your inventory
 */
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { economyService } from '../../services/economy.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your or another user\'s inventory')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view inventory for (defaults to yourself)')
        .setRequired(false)
    ),

  category: 'economy',
  cooldown: 5,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;

    const inventory = await economyService.getInventory(interaction.guild.id, target.id);

    if (inventory.length === 0) {
      return interaction.reply({
        content: `${target.id === interaction.user.id ? 'Your' : `${target.username}'s`} inventory is empty!`,
        ephemeral: true,
      });
    }

    // Pagination
    let page = 0;
    const perPage = 5;
    const totalPages = Math.ceil(inventory.length / perPage);

    const generateEmbed = (pageIndex) => {
      const start = pageIndex * perPage;
      const end = start + perPage;
      const pageItems = inventory.slice(start, end);

      return {
        title: `${EMOJIS.INVENTORY} ${target.username}'s Inventory`,
        color: COLORS.ECONOMY,
        thumbnail: { url: target.displayAvatarURL({ dynamic: true }) },
        description: pageItems.map((item, i) => {
          const totalValue = (item.metadata?.price || 0) * item.quantity;
          return `**${start + i + 1}. ${item.name}** x${item.quantity}\n` +
            `Value: ${EMOJIS.ECONOMY} ${totalValue.toLocaleString()} (${EMOJIS.ECONOMY} ${(item.metadata?.price || 0).toLocaleString()} each)`;
        }).join('\n\n'),
        timestamp: new Date(),
        footer: { text: `Page ${pageIndex + 1} of ${totalPages} • Total items: ${inventory.length}` },
      };
    };

    const generateButtons = (pageIndex) => {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('inv_first')
          .setLabel('⏮️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('inv_prev')
          .setLabel('◀️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('inv_next')
          .setLabel('▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === totalPages - 1),
        new ButtonBuilder()
          .setCustomId('inv_last')
          .setLabel('⏭️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === totalPages - 1)
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
        case 'inv_first':
          page = 0;
          break;
        case 'inv_prev':
          page = Math.max(0, page - 1);
          break;
        case 'inv_next':
          page = Math.min(totalPages - 1, page + 1);
          break;
        case 'inv_last':
          page = totalPages - 1;
          break;
      }
      await i.update({
        embeds: [generateEmbed(page)],
        components: [generateButtons(page)],
      });
    });

    collector.on('end', async () => {
      const disabledButtons = generateButtons(page).components.map(btn => ButtonBuilder.from(btn).setDisabled(true));
      await interaction.editReply({
        components: [new ActionRowBuilder().addComponents(disabledButtons)],
      }).catch(() => {});
    });
  },
};