/**
 * Pagination Button Handlers
 * Generic pagination for any embed-based list
 */
import { ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';

/**
 * Create pagination buttons
 */
export function createPaginationButtons(customIdPrefix, currentPage, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_first`)
      .setLabel('⏮️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_prev`)
      .setLabel('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_next`)
      .setLabel('▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_last`)
      .setLabel('⏭️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1)
  );
}

/**
 * Handle pagination buttons
 */
export function createPaginationHandler(customIdPrefix, generateEmbed, totalPages) {
  return async (interaction, client) => {
    const parts = interaction.customId.split('_');
    const action = parts[parts.length - 1];

    let page = 0;

    switch (action) {
      case 'first':
        page = 0;
        break;
      case 'prev':
        page = Math.max(0, parseInt(parts[parts.length - 2]) - 1);
        break;
      case 'next':
        page = Math.min(totalPages - 1, parseInt(parts[parts.length - 2]) + 1);
        break;
      case 'last':
        page = totalPages - 1;
        break;
    }

    // Extract current page from customId if possible
    const pageMatch = interaction.customId.match(/_(\d+)_/);
    if (pageMatch) {
      const currentPage = parseInt(pageMatch[1]);
      switch (action) {
        case 'prev':
          page = Math.max(0, currentPage - 1);
          break;
        case 'next':
          page = Math.min(totalPages - 1, currentPage + 1);
          break;
        case 'first':
          page = 0;
          break;
        case 'last':
          page = totalPages - 1;
          break;
      }
    }

    // Generate new embed
    const embed = await generateEmbed(page, client);
    const row = createPaginationButtons(customIdPrefix, page, totalPages);

    await interaction.update({ embeds: [embed], components: [row] });
  };
}

/**
 * Register generic pagination handler
 * This expects customIds in format: ${prefix}_${page}_${action}
 */
export function registerPaginationHandler(client, customIdPrefix, generateEmbed, totalPages) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith(`${customIdPrefix}_`)) return;

    const handler = createPaginationHandler(customIdPrefix, generateEmbed, totalPages);
    await handler(interaction, client);
  });
}

/**
 * Create paginated customId
 */
export function createPaginatedCustomId(prefix, page, action) {
  return `${prefix}_${page}_${action}`;
}