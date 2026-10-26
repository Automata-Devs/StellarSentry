/**
 * Ticket Button Handlers
 */
import { ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { ticketRepository } from '../../../database/repositories/TicketRepository.js';
import { guildService } from '../../../services/guild.service.js';
import { eventBus, EVENTS } from '../../../core/eventBus.js';

/**
 * Create ticket button (from panel)
 */
export const ticketCreatePanelButton = new ButtonBuilder()
  .setCustomId('ticket_create_panel')
  .setLabel('Create Ticket')
  .setStyle(ButtonStyle.Primary)
  .setEmoji('🎫');

/**
 * Handle ticket creation from panel
 */
export async function handleTicketCreate(interaction, client) {
  const settings = await guildService.getGuild(interaction.guild.id);
  const ticketSettings = settings?.tickets || {};

  if (!ticketSettings.enabled) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} The ticket system is not enabled for this server.`,
      ephemeral: true,
    });
  }

  // Check max per user
  const userTickets = await ticketRepository.getUserTickets(interaction.guild.id, interaction.user.id);
  const openTickets = userTickets.filter(t => t.status === 'open');
  if (openTickets.length >= (ticketSettings.limits?.maxPerUser || 3)) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} You already have the maximum number of open tickets.`,
      ephemeral: true,
    });
  }

  // Check max open
  const openCount = await ticketRepository.getOpenCount(interaction.guild.id);
  if (openCount >= (ticketSettings.limits?.maxOpen || 50)) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} The maximum number of open tickets has been reached.`,
      ephemeral: true,
    });
  }

  // Show modal for ticket reason
  const modal = new ModalBuilder()
    .setCustomId('ticket_create_modal')
    .setTitle('Create Support Ticket');

  const reasonInput = new TextInputBuilder()
    .setCustomId('ticket_reason')
    .setLabel('Reason for ticket')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe your issue...')
    .setRequired(true)
    .setMaxLength(500);

  const row = new ActionRowBuilder().addComponents(reasonInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

/**
 * Handle ticket creation modal submit
 */
export async function handleTicketCreateModal(interaction, client) {
  const reason = interaction.fields.getTextInputValue('ticket_reason');
  const settings = await guildService.getGuild(interaction.guild.id);
  const ticketSettings = settings?.tickets || {};

  await interaction.deferReply({ ephemeral: true });

  try {
    const category = ticketSettings.category ? interaction.guild.channels.cache.get(ticketSettings.category) : null;
    const supportRole = ticketSettings.supportRole ? interaction.guild.roles.cache.get(ticketSettings.supportRole) : null;

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}-${Date.now().toString().slice(-4)}`,
      type: 0, // GuildText
      parent: category?.id,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles', 'EmbedLinks'] },
        { id: client.user.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles', 'EmbedLinks', 'ManageChannels'] },
        ...(supportRole ? [{ id: supportRole.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles', 'EmbedLinks'] }] : []),
      ],
      topic: `Ticket for ${interaction.user.tag} (${interaction.user.id}) - ${reason}`,
    });

    const ticket = await ticketRepository.create({
      guildId: interaction.guild.id,
      channelId: channel.id,
      userId: interaction.user.id,
      claimedBy: null,
      status: 'open',
      reason,
      createdAt: new Date(),
    });

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.TICKET} Ticket Created`)
      .setColor(COLORS.SUCCESS)
      .setDescription(`Welcome ${interaction.user}! A support member will be with you shortly.\n\n**Reason:** ${reason}`)
      .addFields(
        { name: 'Ticket ID', value: ticket._id.toString(), inline: true },
        { name: 'Created by', value: `${interaction.user}`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'StellarSentry Tickets' });

    const closeButton = new ButtonBuilder()
      .setCustomId(`ticket_close_${ticket._id}`)
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒');

    const claimButton = new ButtonBuilder()
      .setCustomId(`ticket_claim_${ticket._id}`)
      .setLabel('Claim Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('👋');

    const row = new ActionRowBuilder().addComponents(closeButton, claimButton);

    await channel.send({
      content: `${interaction.user}${supportRole ? ` ${supportRole}` : ''}`,
      embeds: [embed],
      components: [row],
    });

    eventBus.emit(EVENTS.TICKET_CREATE, { guildId: interaction.guild.id, ticketId: ticket._id, userId: interaction.user.id });

    await interaction.editReply({
      content: `${EMOJIS.SUCCESS} Ticket created! ${channel}`,
    });
  } catch (error) {
    await interaction.editReply({
      content: `${EMOJIS.ERROR} Failed to create ticket: ${error.message}`,
    });
  }
}

/**
 * Handle ticket close button
 */
export async function handleTicketClose(interaction, client) {
  const ticketId = interaction.customId.split('_')[2];
  const ticket = await ticketRepository.getById(ticketId);

  if (!ticket) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} Ticket not found.`,
      ephemeral: true,
    });
  }

  const settings = await guildService.getGuild(interaction.guild.id);
  const ticketSettings = settings?.tickets || {};

  // Check permissions
  const isCreator = ticket.userId === interaction.user.id;
  const isClaimed = ticket.claimedBy === interaction.user.id;
  const isSupport = ticketSettings.supportRole ? interaction.member.roles.cache.has(ticketSettings.supportRole) : false;

  if (!isCreator && !isClaimed && !isSupport) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} You don't have permission to close this ticket.`,
      ephemeral: true,
    });
  }

  if (ticket.status === 'closed') {
    return interaction.reply({
      content: `${EMOJIS.ERROR} This ticket is already closed.`,
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  try {
    const channel = interaction.channel;

    // Generate transcript if enabled
    if (ticketSettings.transcripts?.enabled) {
      // In production, save transcript to database or upload to pastebin
    }

    await ticketRepository.updateStatus(ticket._id, 'closed');
    await ticketRepository.setClosedAt(ticket._id, new Date());

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.LOCK} Ticket Closed`)
      .setColor(COLORS.ERROR)
      .setDescription(`This ticket has been closed by ${interaction.user}.`)
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    setTimeout(async () => {
      try {
        await channel.delete('Ticket closed');
      } catch (e) {}
    }, 5000);

    eventBus.emit(EVENTS.TICKET_CLOSE, { guildId: interaction.guild.id, ticketId: ticket._id, userId: interaction.user.id });

    await interaction.editReply({ content: `${EMOJIS.SUCCESS} Ticket closed. Channel will be deleted in 5 seconds.` });
  } catch (error) {
    await interaction.editReply({ content: `${EMOJIS.ERROR} Failed to close ticket: ${error.message}` });
  }
}

/**
 * Handle ticket claim button
 */
export async function handleTicketClaim(interaction, client) {
  const ticketId = interaction.customId.split('_')[2];
  const ticket = await ticketRepository.getById(ticketId);

  if (!ticket) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} Ticket not found.`,
      ephemeral: true,
    });
  }

  const settings = await guildService.getGuild(interaction.guild.id);
  const ticketSettings = settings?.tickets || {};

  // Check if user is support
  const isSupport = ticketSettings.supportRole ? interaction.member.roles.cache.has(ticketSettings.supportRole) : false;
  if (!isSupport && !interaction.member.permissions.has('ManageGuild')) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} Only support staff can claim tickets.`,
      ephemeral: true,
    });
  }

  if (ticket.claimedBy) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} This ticket is already claimed.`,
      ephemeral: true,
    });
  }

  try {
    await ticketRepository.claimTicket(ticket._id, interaction.user.id);
    await interaction.reply({ content: `${EMOJIS.SUCCESS} You have claimed this ticket!` });
    eventBus.emit(EVENTS.TICKET_CLAIM, { guildId: interaction.guild.id, ticketId: ticket._id, userId: interaction.user.id });
  } catch (error) {
    await interaction.reply({ content: `${EMOJIS.ERROR} Failed to claim ticket: ${error.message}`, ephemeral: true });
  }
}

/**
 * Register all ticket button handlers
 */
export function registerTicketButtons(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'ticket_create_panel') {
      await handleTicketCreate(interaction, client);
    } else if (interaction.customId.startsWith('ticket_close_')) {
      await handleTicketClose(interaction, client);
    } else if (interaction.customId.startsWith('ticket_claim_')) {
      await handleTicketClaim(interaction, client);
    }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'ticket_create_modal') {
      await handleTicketCreateModal(interaction, client);
    }
  });
}