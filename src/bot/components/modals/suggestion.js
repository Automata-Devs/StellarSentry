/**
 * Suggestion Modal
 */
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

/**
 * Create suggestion submission modal
 */
export function createSuggestionModal() {
  const modal = new ModalBuilder()
    .setCustomId('suggestion_create_modal')
    .setTitle('Submit Suggestion');

  const titleInput = new TextInputBuilder()
    .setCustomId('suggestion_title')
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Brief title for your suggestion')
    .setRequired(true)
    .setMaxLength(256);

  const contentInput = new TextInputBuilder()
    .setCustomId('suggestion_content')
    .setLabel('Details')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe your suggestion in detail...')
    .setRequired(true)
    .setMaxLength(4000);

  const row1 = new ActionRowBuilder().addComponents(titleInput);
  const row2 = new ActionRowBuilder().addComponents(contentInput);

  modal.addComponents(row1, row2);

  return modal;
}

/**
 * Create suggestion review modal (approve/deny/consider)
 */
export function createSuggestionReviewModal(action) {
  const modal = new ModalBuilder()
    .setCustomId(`suggestion_${action}_modal`)
    .setTitle(`${action.charAt(0).toUpperCase() + action.slice(1)} Suggestion`);

  const reasonInput = new TextInputBuilder()
    .setCustomId('review_reason')
    .setLabel('Reason')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(`Why are you ${action}ing this suggestion?`)
    .setRequired(true)
    .setMaxLength(1000);

  const notesInput = new TextInputBuilder()
    .setCustomId('review_notes')
    .setLabel('Notes (optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Additional notes for the author...')
    .setRequired(false)
    .setMaxLength(2000);

  const row1 = new ActionRowBuilder().addComponents(reasonInput);
  const row2 = new ActionRowBuilder().addComponents(notesInput);

  modal.addComponents(row1, row2);

  return modal;
}