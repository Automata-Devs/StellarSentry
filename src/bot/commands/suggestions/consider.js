/**
 * Suggest Consider Command - Mark a suggestion as under consideration
 */
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { Suggestion } from '../../database/models/Suggestion.js';
import { guildService } from '../../services/guild.service.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';

export default {
  data: new SlashCommandBuilder()
    .setName('consider')
    .setDescription('Mark a suggestion as under consideration')
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The message ID of the suggestion to consider')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for consideration')
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
    const reason = interaction.options.getString('reason') || 'Under consideration by staff';
    const notes = interaction.options.getString('notes');

    const settings = await guildService.getGuild(interaction.guild.id);
    const suggestionSettings = settings?.suggestions || {};

    // Check if user has approval role
    if (suggestionSettings.approval?.roles?.length) {
      const hasRole = interaction.member.roles.cache.some(r => suggestionSettings.approval.roles.includes(r.id));
      if (!hasRole && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: `${EMOJIS.ERROR} You don't have permission to consider suggestions.`,
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
      suggestion.consider(interaction.user.id, reason, notes);

      // Update message
      const channel = interaction.guild.channels.cache.get(suggestion.channelId);
      const message = await channel.messages.fetch(suggestion.messageId);

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.SUGGESTION} ${suggestion.title} 🤔 UNDER CONSIDERATION`)
        .setColor(COLORS.WARNING)
        .setDescription(suggestion.content)
        .addFields(
          { name: 'Author', value: suggestion.anonymous ? 'Anonymous' : `<@${suggestion.authorId}>`, inline: true },
          { name: 'Status', value: 'Under Consideration', inline: true },
          { name: 'Considered by', value: `${interaction.user}`, inline: true },
          { name: 'Reason', value: reason, inline: false },
        )
        .setTimestamp()
        .setFooter({ text: `Suggestion ID: ${suggestion._id}` });

      if (notes) {
        embed.addFields({ name: 'Notes', value: notes, inline: false });
      }

      // Keep vote buttons for further community input
      await message.edit({ embeds: [embed] });

      eventBus.emit(EVENTS.SUGGESTION_CONSIDER, { guildId: interaction.guild.id, suggestionId: suggestion._id, moderatorId: interaction.user.id });

      await interaction.editReply({
        content: `${EMOJIS.SUCCESS} Suggestion marked as under consideration!`,
      });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to consider suggestion: ${error.message}`,
      });
    }
  },
};