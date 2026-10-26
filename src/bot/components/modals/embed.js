/**
 * Embed Modal
 */
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

/**
 * Create embed builder modal
 */
export function createEmbedModal() {
  const modal = new ModalBuilder()
    .setCustomId('embed_create_modal')
    .setTitle('Create Custom Embed');

  const titleInput = new TextInputBuilder()
    .setCustomId('embed_title')
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Embed title')
    .setRequired(false)
    .setMaxLength(256);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('embed_description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Embed description')
    .setRequired(false)
    .setMaxLength(4000);

  const colorInput = new TextInputBuilder()
    .setCustomId('embed_color')
    .setLabel('Color (hex)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('#5865F2')
    .setRequired(false)
    .setMaxLength(7);

  const imageInput = new TextInputBuilder()
    .setCustomId('embed_image')
    .setLabel('Image URL')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('https://example.com/image.png')
    .setRequired(false)
    .setMaxLength(500);

  const footerInput = new TextInputBuilder()
    .setCustomId('embed_footer')
    .setLabel('Footer Text')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Footer text')
    .setRequired(false)
    .setMaxLength(2048);

  const row1 = new ActionRowBuilder().addComponents(titleInput);
  const row2 = new ActionRowBuilder().addComponents(descriptionInput);
  const row3 = new ActionRowBuilder().addComponents(colorInput);
  const row4 = new ActionRowBuilder().addComponents(imageInput);
  const row5 = new ActionRowBuilder().addComponents(footerInput);

  modal.addComponents(row1, row2, row3, row4, row5);

  return modal;
}