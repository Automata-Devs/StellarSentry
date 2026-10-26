/**
 * Suggest Approve Command - Approve a suggestion
 */
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { Suggestion } from '../../database/models/Suggestion.js';
import { guildService } from '../../services/guild.service.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';

export default {
  data: new SlashCommandBuilder()
    .setName('approve')
    .setDescription('Approve a suggestion')
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The message ID of the suggestion to approve')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for approval')
        .setRequired(false)
        .setMaxLength(1000)
    )
    .addStringOption(option =>
      option.setName('notes')
        .setDescription('Additional notes')
        .setRequired(false)
        .setMaxLength(2000)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  category: 'suggestions',
  cooldown: 5,
  permissions: { user: ['ManageGuild'], bot: ['SendMessages', 'EmbedLinks', 'ManageMessages'] },
  guildOnly: true,

  async execute(interaction, client) {
    const messageId = interaction.options.getString('message_id');
    const reason = interaction.options.getString('reason') || 'Approved by staff';
    const notes = interaction.options.getString('notes');

    const settings = await guildService.getGuild(interaction.guild.id);
    const suggestionSettings = settings?.suggestions || {};

    // Check if user has approval role
    if (suggestionSettings.approval?.roles?.length) {
      const hasRole = interaction.member.roles.cache.some(r => suggestionSettings.approval.roles.includes(r.id));
      if (!hasRole && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: `${EMOJIS.ERROR} You don't have permission to approve suggestions.`,
          ephemeral: true,
        });
      }
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const suggestion = await Suggestion.findOne({ messageId, guildId: interaction.guild.id });

      if (!suggestion) {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} No suggestion found with that message ID.`,
        });
      }

      if (suggestion.status !== 'pending') {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} Suggestion is already ${suggestion.status}.`,
        });
      }

      // Update suggestion
      suggestion.approve(interaction.user.id, reason, notes);

      // Update message
      const channel = interaction.guild.channels.cache.get(suggestion.channelId);
      const message = await channel.messages.fetch(suggestion.messageId);

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.SUGGESTION} ${suggestion.title} ✅ APPROVED`)
        .setColor(COLORS.SUCCESS)
        .setDescription(suggestion.content)
        .addFields(
          { name: 'Author', value: suggestion.anonymous ? 'Anonymous' : `<@${suggestion.authorId}>`, inline: true },
          { name: 'Status', value: 'Approved', inline: true },
          { name: 'Approved by', value: `${interaction.user}`, inline: true },
          { name: 'Reason', value: reason, inline: false },
        )
        .setTimestamp()
        .setFooter({ text: `Suggestion ID: ${suggestion._id}` });

      if (notes) {
        embed.addFields({ name: 'Notes', value: notes, inline: false });
      }

      // Remove vote buttons
      await message.edit({ embeds: [embed], components: [] });

      eventBus.emit(EVENTS.SUGGESTION_APPROVE, { guildId: interaction.guild.id, suggestionId: suggestion._id, moderatorId: interaction.user.id });

      await interaction.editReply({
        content: `${EMOJIS.SUCCESS} Suggestion approved!`,
      });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to approve suggestion: ${error.message}`,
      });
    }
  },
};