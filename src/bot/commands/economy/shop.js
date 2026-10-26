/**
 * Shop Command - View the server shop
 */
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { economyService } from '../../services/economy.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View the server shop'),

  category: 'economy',
  cooldown: 10,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const shop = await economyService.getShop(interaction.guild.id);

    if (shop.length === 0) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} The shop is empty!`,
        ephemeral: true,
      });
    }

    // Filter out hidden items
    const visibleItems = shop.filter(item => !item.hidden);

    if (visibleItems.length === 0) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} No items available in the shop.`,
        ephemeral: true,
      });
    }

    // Pagination
    let page = 0;
    const perPage = 5;
    const totalPages = Math.ceil(visibleItems.length / perPage);

    const generateEmbed = (pageIndex) => {
      const start = pageIndex * perPage;
      const end = start + perPage;
      const pageItems = visibleItems.slice(start, end);

      return {
        title: `${EMOJIS.SHOP} ${interaction.guild.name}'s Shop`,
        color: COLORS.ECONOMY,
        description: pageItems.map((item, i) => {
          const stockText = item.stock === -1 ? '∞' : `${item.stock - item.sold}/${item.stock}`;
          return `**${start + i + 1}. ${item.emoji} ${item.name}**\n` +
            `${item.description ? `> ${item.description}\n` : ''}` +
            `Price: ${EMOJIS.ECONOMY} ${item.price.toLocaleString()} | Stock: ${stockText} | Max: ${item.maxPerUser} per user` +
            (item.roleId ? ` | Role: <@&${item.roleId}>` : '') +
            (item.requirements?.level ? ` | Level: ${item.requirements.level}+` : '');
        }).join('\n\n'),
        timestamp: new Date(),
        footer: { text: `Page ${pageIndex + 1} of ${totalPages} • Use /buy <item> to purchase` },
      };
    };

    const generateButtons = (pageIndex) => {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('shop_first')
          .setLabel('⏮️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('shop_prev')
          .setLabel('◀️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('shop_next')
          .setLabel('▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === totalPages - 1),
        new ButtonBuilder()
          .setCustomId('shop_last')
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
        case 'shop_first':
          page = 0;
          break;
        case 'shop_prev':
          page = Math.max(0, page - 1);
          break;
        case 'shop_next':
          page = Math.min(totalPages - 1, page + 1);
          break;
        case 'shop_last':
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