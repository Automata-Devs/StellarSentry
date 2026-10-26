/**
 * Pagination Utility - Create paginated embeds and components
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from 'discord.js';
import { COLORS, LIMITS } from '../config/constants.js';

/**
 * Create pagination buttons
 * @param {string} prefix - Custom ID prefix
 * @param {number} currentPage - Current page (0-indexed)
 * @param {number} totalPages - Total number of pages
 * @returns {ActionRowBuilder}
 */
export function createPaginationButtons(prefix, currentPage, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}_first`)
      .setLabel('⏮️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`${prefix}_prev`)
      .setLabel('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`${prefix}_next`)
      .setLabel('▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`${prefix}_last`)
      .setLabel('⏭️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1)
  );
}

/**
 * Create a paginated embed sender
 * @param {Object} options
 * @returns {Object} { embeds, components }
 */
export function createPaginatedEmbed(items, options = {}) {
  const {
    itemsPerPage = 10,
    title,
    color = 0x5865F2,
    formatItem = (item, index) => `${index + 1}. ${item}`,
    footer = 'StellarSentry',
  } = options;

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const pages = [];

  for (let i = 0; i < totalPages; i++) {
    const start = i * itemsPerPage;
    const end = Math.min(start + itemsPerPage, items.length);
    const pageItems = items.slice(start, end);

    const embed = {
      color: 0x5865F2,
      title,
      description: pageItems.map((item, index) => formatItem(item, start + index)).join('\n'),
      timestamp: new Date(),
      footer: { text: `Page ${i + 1} of ${totalPages} • ${footer}` },
    };

    pages.push({ embed, page: i });
  }

  return { pages, totalPages };
}

/**
 * Send paginated message with navigation
 * @param {Interaction} interaction
 * @param {Array} items
 * @param {Object} options
 * @returns {Promise<void>}
 */
export async function sendPaginated(interaction, items, options = {}) {
  const {
    itemsPerPage = 10,
    title,
    color = 0x5865F2,
    formatItem = (item, index) => `${index + 1}. ${item}`,
    footer = 'StellarSentry',
    ephemeral = false,
    customId = 'paginate',
  } = options;

  if (items.length === 0) {
    return interaction.reply({
      content: 'No items to display.',
      ephemeral: true,
    });
  }

  if (items.length <= itemsPerPage) {
    // Single page, no pagination needed
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(items.map((item, index) => formatItem(item, index)).join('\n'))
      .setTimestamp()
      .setFooter({ text: 'StellarSentry' });

    return interaction.reply({ embeds: [embed], ephemeral });
  }

  // Multiple pages - create pagination
  const totalPages = Math.ceil(items.length / itemsPerPage);
  let currentPage = 0;

  const generateEmbed = (page) => {
    const start = page * itemsPerPage;
    const end = Math.min(start + itemsPerPage, items.length);
    const pageItems = items.slice(start, end);

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(pageItems.map((item, index) => formatItem(item, start + index)).join('\n'))
      .setTimestamp()
      .setFooter({ text: `Page ${page + 1} of ${totalPages} • ${footer}` });
  };

  const generateButtons = (page) => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${customId}_first`)
        .setLabel('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`${customId}_prev`)
        .setLabel('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`${customId}_next`)
        .setLabel('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages - 1),
      new ButtonBuilder()
        .setCustomId(`${customId}_last`)
        .setLabel('⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages - 1)
    );
  };

  const reply = await interaction.reply({
    embeds: [generateEmbed(currentPage)],
    components: [generateButtons(currentPage)],
    fetchReply: true,
    ephemeral,
  });

  // Collect button interactions
  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300000, // 5 minutes
    filter: i => i.user.id === interaction.user.id && i.customId.startsWith(customId),
  });

  collector.on('collect', async i => {
    if (i.customId.endsWith('_first')) currentPage = 0;
    else if (i.customId.endsWith('_prev')) currentPage = Math.max(0, currentPage - 1);
    else if (i.customId.endsWith('_next')) currentPage = Math.min(totalPages - 1, currentPage + 1);
    else if (i.customId.endsWith('_last')) currentPage = totalPages - 1;

    await i.update({
      embeds: [generateEmbed(currentPage)],
      components: [generateButtons(currentPage)],
    });
  });

  collector.on('end', async () => {
    const disabledButtons = generateButtons(currentPage).components.map(btn =>
      ButtonBuilder.from(btn).setDisabled(true)
    );
    await interaction.editReply({
      components: [new ActionRowBuilder().addComponents(disabledButtons)],
    }).catch(() => {});
  });
}

/**
 * Create a select menu for page selection (alternative to buttons)
 * @param {string} customId
 * @param {number} totalPages
 * @param {number} currentPage
 * @returns {ActionRowBuilder}
 */
export function createPageSelectMenu(customId, totalPages, currentPage) {
  const options = [];
  for (let i = 0; i < totalPages; i++) {
    options.push({
      label: `Page ${i + 1}`,
      value: i.toString(),
      default: i === currentPage,
    });
  }

  return new ActionRowBuilder().addComponents(
    new (require('discord.js').StringSelectMenuBuilder)()
      .setCustomId(customId)
      .setPlaceholder('Select a page...')
      .addOptions(options)
  );
}

export default {
  createPaginationButtons,
  createPaginatedEmbed,
  sendPaginated,
  createPageSelectMenu,
};