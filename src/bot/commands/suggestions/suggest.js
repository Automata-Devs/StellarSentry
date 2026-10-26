/**
 * Suggest Command - Submit a suggestion
 */
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { Suggestion } from '../../database/models/Suggestion.js';
import { guildService } from '../../services/guild.service.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';

export default {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Title of your suggestion')
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption(option =>
      option.setName('content')
        .setDescription('Details of your suggestion')
        .setRequired(true)
        .setMaxLength(4000)
    )
    .addBooleanOption(option =>
      option.setName('anonymous')
        .setDescription('Submit anonymously (if allowed by server)')
        .setRequired(false)
    ),

  category: 'suggestions',
  cooldown: 30,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks', 'AddReactions', 'CreatePublicThreads'] },
  guildOnly: true,

  async execute(interaction, client) {
    const title = interaction.options.getString('title');
    const content = interaction.options.getString('content');
    const anonymous = interaction.options.getBoolean('anonymous') || false;

    const settings = await guildService.getGuild(interaction.guild.id);
    const suggestionSettings = settings?.suggestions || {};

    if (!suggestionSettings.enabled) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} The suggestion system is not enabled for this server.`,
        ephemeral: true,
      });
    }

    const channelId = suggestionSettings.channel;
    if (!channelId) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} No suggestion channel configured. Ask staff to set one up.`,
        ephemeral: true,
      });
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Suggestion channel not found.`,
        ephemeral: true,
      });
    }

    const finalAnonymous = anonymous && suggestionSettings.anonymous;

    // Create suggestion in database
    const suggestion = await Suggestion.create({
      guildId: interaction.guild.id,
      channelId: channel.id,
      authorId: finalAnonymous ? null : interaction.user.id,
      title,
      content,
      anonymous: finalAnonymous,
      status: suggestionSettings.approval?.required ? 'pending' : 'pending', // Still pending even if no approval required, just auto-posts
      votes: { up: [], down: [], upCount: 0, downCount: 0 },
    });

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.SUGGESTION} ${title}`)
      .setColor(COLORS.PRIMARY)
      .setDescription(content)
      .addFields(
        { name: 'Author', value: finalAnonymous ? 'Anonymous' : `${interaction.user}`, inline: true },
        { name: 'Status', value: suggestionSettings.approval?.required ? 'Pending Review' : 'Open for Voting', inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `Suggestion ID: ${suggestion._id}` });

    const upvoteEmoji = suggestionSettings.voting?.upvoteEmoji || '👍';
    const downvoteEmoji = suggestionSettings.voting?.downvoteEmoji || '👎';

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`suggestion_upvote_${suggestion._id}`)
        .setLabel('0')
        .setStyle(ButtonStyle.Success)
        .setEmoji(upvoteEmoji),
      new ButtonBuilder()
        .setCustomId(`suggestion_downvote_${suggestion._id}`)
        .setLabel('0')
        .setStyle(ButtonStyle.Danger)
        .setEmoji(downvoteEmoji)
    );

    const message = await channel.send({
      embeds: [embed],
      components: [row],
    });

    // Update suggestion with message ID
    suggestion.messageId = message.id;
    await suggestion.save();

    // Create thread for discussion if enabled
    // Could add thread creation here

    eventBus.emit(EVENTS.SUGGESTION_CREATE, { guildId: interaction.guild.id, suggestionId: suggestion._id, authorId: interaction.user.id });

    await interaction.reply({
      content: `${EMOJIS.SUCCESS} Your suggestion has been submitted${suggestionSettings.approval?.required ? ' and is pending review' : ''}!`,
      ephemeral: true,
    });
  },
};