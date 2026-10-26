/**
 * Ticket Modal
 */
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

/**
 * Create ticket creation modal
 */
export function createTicketModal() {
  const modal = new ModalBuilder()
    .setCustomId('ticket_create_modal')
    .setTitle('Create Support Ticket');

  const reasonInput = new TextInputBuilder()
    .setCustomId('ticket_reason')
    .setLabel('Reason for ticket')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe your issue in detail...')
    .setRequired(true)
    .setMaxLength(500);

  const row = new ActionRowBuilder().addComponents(reasonInput);
  modal.addComponents(row);

  return modal;
}

/**
 * Create ticket close modal (with reason)
 */
export function createTicketCloseModal() {
  const modal = new ModalBuilder()
    .setCustomId('ticket_close_modal')
    .setTitle('Close Ticket');

  const reasonInput = new TextInputBuilder()
    .setCustomId('close_reason')
    .setLabel('Reason for closing')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Optional: Why are you closing this ticket?')
    .setRequired(false)
    .setMaxLength(500);

  const row = new ActionRowBuilder().addComponents(reasonInput);
  modal.addComponents(row);

  return modal;
}