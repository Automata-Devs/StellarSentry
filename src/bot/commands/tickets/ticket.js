/**
 * Ticket Command - Create and manage tickets
 */
import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { ticketRepository } from '../../database/repositories/TicketRepository.js';
import { guildService } from '../../services/guild.service.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage support tickets')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new ticket')
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for creating the ticket')
            .setRequired(true)
            .setMaxLength(500)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('Close the current ticket')
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for closing')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a user to the ticket')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to add')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a user from the ticket')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('claim')
        .setDescription('Claim the ticket')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unclaim')
        .setDescription('Unclaim the ticket')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Set up the ticket panel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel to send the panel to')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Panel title')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Panel description')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('button_label')
            .setDescription('Button label')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('button_style')
            .setDescription('Button style')
            .setRequired(false)
            .addChoices(
              { name: 'Primary (Blurple)', value: 'Primary' },
              { name: 'Secondary (Grey)', value: 'Secondary' },
              { name: 'Success (Green)', value: 'Success' },
              { name: 'Danger (Red)', value: 'Danger' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('Configure ticket settings')
        .addChannelOption(option =>
          option.setName('category')
            .setDescription('Category for tickets')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option.setName('support_role')
            .setDescription('Support team role')
            .setRequired(false)
        )
        .addChannelOption(option =>
          option.setName('log_channel')
            .setDescription('Channel for ticket logs')
            .setRequired(false)
        )
        .addChannelOption(option =>
          option.setName('transcript_channel')
            .setDescription('Channel for transcripts')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option.setName('transcripts_enabled')
            .setDescription('Enable transcripts on close')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('max_per_user')
            .setDescription('Max tickets per user')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10)
        )
        .addIntegerOption(option =>
          option.setName('max_open')
            .setDescription('Max open tickets total')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(200)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  category: 'tickets',
  cooldown: 5,
  permissions: { user: ['SendMessages'], bot: ['ManageChannels', 'SendMessages', 'EmbedLinks', 'ViewChannel', 'ManageRoles'] },
  guildOnly: true,

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const settings = await guildService.getGuild(interaction.guild.id);
    const ticketSettings = settings?.tickets || {};

    switch (subcommand) {
      case 'create':
        await handleCreate(interaction, ticketSettings);
        break;
      case 'close':
        await handleClose(interaction, ticketSettings);
        break;
      case 'add':
        await handleAdd(interaction);
        break;
      case 'remove':
        await handleRemove(interaction);
        break;
      case 'claim':
        await handleClaim(interaction);
        break;
      case 'unclaim':
        await handleUnclaim(interaction);
        break;
      case 'setup':
        await handleSetup(interaction, ticketSettings);
        break;
      case 'config':
        await handleConfig(interaction, ticketSettings);
        break;
    }
  },
};

async function handleCreate(interaction, settings) {
  if (!settings.enabled) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} The ticket system is not enabled for this server.`,
      ephemeral: true,
    });
  }

  const reason = interaction.options.getString('reason');

  // Check max per user
  const userTickets = await ticketRepository.getUserTickets(interaction.guild.id, interaction.user.id);
  const openTickets = userTickets.filter(t => t.status === 'open');
  if (openTickets.length >= (settings.limits?.maxPerUser || 3)) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} You already have the maximum number of open tickets (${settings.limits?.maxPerUser || 3}).`,
      ephemeral: true,
    });
  }

  // Check max open
  const openCount = await ticketRepository.getOpenCount(interaction.guild.id);
  if (openCount >= (settings.limits?.maxOpen || 50)) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} The maximum number of open tickets has been reached.`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Create ticket channel
    const category = settings.category ? interaction.guild.channels.cache.get(settings.category) : null;
    const supportRole = settings.supportRole ? interaction.guild.roles.cache.get(settings.supportRole) : null;

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}-${Date.now().toString().slice(-4)}`,
      type: ChannelType.GuildText,
      parent: category?.id,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles', 'EmbedLinks'] },
        { id: client.user.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles', 'EmbedLinks', 'ManageChannels'] },
        ...(supportRole ? [{ id: supportRole.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles', 'EmbedLinks'] }] : []),
      ],
      topic: `Ticket for ${interaction.user.tag} (${interaction.user.id}) - ${reason}`,
    });

    // Create ticket in database
    const ticket = await ticketRepository.create({
      guildId: interaction.guild.id,
      channelId: channel.id,
      userId: interaction.user.id,
      claimedBy: null,
      status: 'open',
      reason,
      createdAt: new Date(),
    });

    // Send welcome message in ticket
    const welcomeEmbed = new EmbedBuilder()
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
      embeds: [welcomeEmbed],
      components: [row],
    });

    // Emit event
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

async function handleClose(interaction, settings) {
  const channel = interaction.channel;

  // Check if this is a ticket channel
  const ticket = await ticketRepository.getByChannelId(interaction.guild.id, channel.id);
  if (!ticket) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} This is not a ticket channel.`,
      ephemeral: true,
    });
  }

  // Check permissions - only creator, claimant, or support can close
  const isCreator = ticket.userId === interaction.user.id;
  const isClaimed = ticket.claimedBy === interaction.user.id;
  const isSupport = settings.supportRole ? interaction.member.roles.cache.has(settings.supportRole) : false;

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

  const reason = interaction.options.getString('reason') || 'No reason provided';

  await interaction.deferReply();

  try {
    // Generate transcript if enabled
    let transcriptUrl = null;
    if (settings.transcripts?.enabled && settings.transcripts?.channel) {
      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const transcript = messages.reverse().map(m =>
          `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`).join('\n');

        // In production, upload to pastebin or store in database
        transcriptUrl = `Transcript generated (${transcript.length} chars)`;
      } catch (e) {
        console.error('Failed to generate transcript:', e);
      }
    }

    // Update ticket
    await ticketRepository.updateStatus(ticket._id, 'closed');
    await ticketRepository.setClosedAt(ticket._id, new Date());

    // Send closing message
    const closeEmbed = new EmbedBuilder()
      .setTitle(`${EMOJIS.LOCK} Ticket Closed`)
      .setColor(COLORS.ERROR)
      .setDescription(`This ticket has been closed by ${interaction.user}.\n**Reason:** ${reason}`)
      .setTimestamp();

    await channel.send({ embeds: [closeEmbed] });

    // Delete channel after delay
    setTimeout(async () => {
      try {
        await channel.delete('Ticket closed');
      } catch (e) {
        console.error('Failed to delete ticket channel:', e);
      }
    }, 5000);

    // Log
    if (settings.logChannel) {
      const logChannel = interaction.guild.channels.cache.get(settings.logChannel);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle(`${EMOJIS.TICKET} Ticket Closed`)
          .setColor(COLORS.ERROR)
          .addFields(
            { name: 'Ticket', value: `#${ticket._id}`, inline: true },
            { name: 'Channel', value: channel.name, inline: true },
            { name: 'Creator', value: `<@${ticket.userId}>`, inline: true },
            { name: 'Closed by', value: `${interaction.user}`, inline: true },
            { name: 'Reason', value: reason, inline: false },
          )
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }

    eventBus.emit(EVENTS.TICKET_CLOSE, { guildId: interaction.guild.id, ticketId: ticket._id, userId: interaction.user.id });

    await interaction.editReply({ content: `${EMOJIS.SUCCESS} Ticket closed. Channel will be deleted in 5 seconds.` });
  } catch (error) {
    await interaction.editReply({ content: `${EMOJIS.ERROR} Failed to close ticket: ${error.message}` });
  }
}

async function handleAdd(interaction) {
  const channel = interaction.channel;
  const user = interaction.options.getUser('user');

  const ticket = await ticketRepository.getByChannelId(interaction.guild.id, channel.id);
  if (!ticket) {
    return interaction.reply({ content: `${EMOJIS.ERROR} This is not a ticket channel.`, ephemeral: true });
  }

  try {
    await channel.permissionOverwrites.edit(user, { ViewChannel: true, SendMessages: true });
    await interaction.reply({ content: `${EMOJIS.SUCCESS} Added ${user} to the ticket.`, ephemeral: true });
  } catch (error) {
    await interaction.reply({ content: `${EMOJIS.ERROR} Failed to add user: ${error.message}`, ephemeral: true });
  }
}

async function handleRemove(interaction) {
  const channel = interaction.channel;
  const user = interaction.options.getUser('user');

  const ticket = await ticketRepository.getByChannelId(interaction.guild.id, channel.id);
  if (!ticket) {
    return interaction.reply({ content: `${EMOJIS.ERROR} This is not a ticket channel.`, ephemeral: true });
  }

  if (user.id === ticket.userId) {
    return interaction.reply({ content: `${EMOJIS.ERROR} Cannot remove the ticket creator.`, ephemeral: true });
  }

  try {
    await channel.permissionOverwrites.delete(user);
    await interaction.reply({ content: `${EMOJIS.SUCCESS} Removed ${user} from the ticket.`, ephemeral: true });
  } catch (error) {
    await interaction.reply({ content: `${EMOJIS.ERROR} Failed to remove user: ${error.message}`, ephemeral: true });
  }
}

async function handleClaim(interaction) {
  const channel = interaction.channel;
  const settings = await guildService.getGuild(interaction.guild.id);
  const ticketSettings = settings?.tickets || {};

  const ticket = await ticketRepository.getByChannelId(interaction.guild.id, channel.id);
  if (!ticket) {
    return interaction.reply({ content: `${EMOJIS.ERROR} This is not a ticket channel.`, ephemeral: true });
  }

  if (ticket.claimedBy) {
    return interaction.reply({ content: `${EMOJIS.ERROR} This ticket is already claimed.`, ephemeral: true });
  }

  // Check if user is support
  const isSupport = ticketSettings.supportRole ? interaction.member.roles.cache.has(ticketSettings.supportRole) : false;
  if (!isSupport && !interaction.member.permissions.has('ManageGuild')) {
    return interaction.reply({ content: `${EMOJIS.ERROR} Only support staff can claim tickets.`, ephemeral: true });
  }

  try {
    await ticketRepository.claimTicket(ticket._id, interaction.user.id);
    await interaction.reply({ content: `${EMOJIS.SUCCESS} You have claimed this ticket!` });
    eventBus.emit(EVENTS.TICKET_CLAIM, { guildId: interaction.guild.id, ticketId: ticket._id, userId: interaction.user.id });
  } catch (error) {
    await interaction.reply({ content: `${EMOJIS.ERROR} Failed to claim ticket: ${error.message}`, ephemeral: true });
  }
}

async function handleUnclaim(interaction) {
  const channel = interaction.channel;
  const ticket = await ticketRepository.getByChannelId(interaction.guild.id, channel.id);

  if (!ticket) {
    return interaction.reply({ content: `${EMOJIS.ERROR} This is not a ticket channel.`, ephemeral: true });
  }

  if (!ticket.claimedBy) {
    return interaction.reply({ content: `${EMOJIS.ERROR} This ticket is not claimed.`, ephemeral: true });
  }

  if (ticket.claimedBy !== interaction.user.id && !interaction.member.permissions.has('ManageGuild')) {
    return interaction.reply({ content: `${EMOJIS.ERROR} You can only unclaim your own tickets.`, ephemeral: true });
  }

  try {
    await ticketRepository.unclaimTicket(ticket._id);
    await interaction.reply({ content: `${EMOJIS.SUCCESS} Ticket unclaimed.` });
  } catch (error) {
    await interaction.reply({ content: `${EMOJIS.ERROR} Failed to unclaim ticket: ${error.message}`, ephemeral: true });
  }
}

async function handleSetup(interaction, settings) {
  const channel = interaction.options.getChannel('channel');
  const title = interaction.options.getString('title') || settings.panel?.title || 'Support Tickets';
  const description = interaction.options.getString('description') || settings.panel?.description || 'Click the button below to create a ticket.';
  const buttonLabel = interaction.options.getString('button_label') || settings.panel?.buttonLabel || 'Create Ticket';
  const buttonStyle = interaction.options.getString('button_style') || settings.panel?.buttonStyle || 'Primary';

  if (!settings.enabled) {
    return interaction.reply({ content: `${EMOJIS.ERROR} Please enable the ticket system first with \`/ticket config\`.`, ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(COLORS.PRIMARY)
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId('ticket_create_panel')
    .setLabel(buttonLabel)
    .setStyle(ButtonStyle[buttonStyle] || ButtonStyle.Primary)
    .setEmoji('🎫');

  const row = new ActionRowBuilder().addComponents(button);

  await channel.send({ embeds: [embed], components: [row] });

  await guildService.updateSettings(interaction.guild.id, {
    'tickets.panel.channel': channel.id,
    'tickets.panel.messageId': (await channel.send({ embeds: [embed], components: [row] })).id,
    'tickets.panel.title': title,
    'tickets.panel.description': description,
    'tickets.panel.buttonLabel': buttonLabel,
    'tickets.panel.buttonStyle': buttonStyle,
  });

  await interaction.reply({ content: `${EMOJIS.SUCCESS} Ticket panel sent to ${channel}!`, ephemeral: true });
}

async function handleConfig(interaction, settings) {
  const updates = {};

  const category = interaction.options.getChannel('category');
  if (category) updates['tickets.category'] = category.id;

  const supportRole = interaction.options.getRole('support_role');
  if (supportRole) updates['tickets.supportRole'] = supportRole.id;

  const logChannel = interaction.options.getChannel('log_channel');
  if (logChannel) updates['tickets.logChannel'] = logChannel.id;

  const transcriptChannel = interaction.options.getChannel('transcript_channel');
  if (transcriptChannel) updates['tickets.transcripts.channel'] = transcriptChannel.id;

  const transcriptsEnabled = interaction.options.getBoolean('transcripts_enabled');
  if (transcriptsEnabled !== null) updates['tickets.transcripts.enabled'] = transcriptsEnabled;

  const maxPerUser = interaction.options.getInteger('max_per_user');
  if (maxPerUser) updates['tickets.limits.maxPerUser'] = maxPerUser;

  const maxOpen = interaction.options.getInteger('max_open');
  if (maxOpen) updates['tickets.limits.maxOpen'] = maxOpen;

  if (Object.keys(updates).length === 0) {
    return interaction.reply({ content: `${EMOJIS.ERROR} No settings provided to update.`, ephemeral: true });
  }

  await guildService.updateSettings(interaction.guild.id, updates);

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Ticket Settings Updated`)
    .setColor(COLORS.SUCCESS)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}