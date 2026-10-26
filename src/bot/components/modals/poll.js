/**
 * Poll Modal
 */
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

/**
 * Create poll creation modal
 */
export function createPollModal() {
  const modal = new ModalBuilder()
    .setCustomId('poll_create_modal')
    .setTitle('Create Poll');

  const questionInput = new TextInputBuilder()
    .setCustomId('poll_question')
    .setLabel('Poll Question')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('What do you want to ask?')
    .setRequired(true)
    .setMaxLength(256);

  const optionsInput = new TextInputBuilder()
    .setCustomId('poll_options')
    .setLabel('Options (separated by |)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Option 1 | Option 2 | Option 3')
    .setRequired(true)
    .setMaxLength(1000);

  const durationInput = new TextInputBuilder()
    .setCustomId('poll_duration')
    .setLabel('Duration (minutes)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('5')
    .setRequired(false)
    .setMaxLength(3);

  const row1 = new ActionRowBuilder().addComponents(questionInput);
  const row2 = new ActionRowBuilder().addComponents(optionsInput);
  const row3 = new ActionRowBuilder().addComponents(durationInput);

  modal.addComponents(row1, row2, row3);

  return modal;
}