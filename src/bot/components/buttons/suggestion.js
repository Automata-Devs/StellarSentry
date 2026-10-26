/**
 * Suggestion Button Handlers
 */
import { ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { Suggestion } from '../../../database/models/Suggestion.js';
import { guildService } from '../../../services/guild.service.js';
import { eventBus, EVENTS } from '../../../core/eventBus.js';

/**
 * Suggestion upvote button
 */
export function createSuggestionUpvoteButton(suggestionId, count = 0) {
  return new ButtonBuilder()
    .setCustomId(`suggestion_upvote_${suggestionId}`)
    .setLabel(count.toString())
    .setStyle(ButtonStyle.Success)
    .setEmoji('👍');
}

/**
 * Suggestion downvote button
 */
export function createSuggestionDownvoteButton(suggestionId, count = 0) {
  return new ButtonBuilder()
    .setCustomId(`suggestion_downvote_${suggestionId}`)
    .setLabel(count.toString())
    .setStyle(ButtonStyle.Danger)
    .setEmoji('👎');
}

/**
 * Create suggestion button row
 */
export function createSuggestionButtonRow(suggestionId, upvotes = 0, downvotes = 0) {
  return new ActionRowBuilder().addComponents(
    createSuggestionUpvoteButton(suggestionId, upvotes),
    createSuggestionDownvoteButton(suggestionId, downvotes)
  );
}

/**
 * Handle suggestion upvote
 */
export async function handleSuggestionUpvote(interaction, client) {
  const suggestionId = interaction.customId.split('_')[2];

  try {
    const suggestion = await Suggestion.findById(suggestionId);

    if (!suggestion) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Suggestion not found.`,
        ephemeral: true,
      });
    }

    // Vote
    await suggestion.vote(interaction.user.id, 'up');

    // Update buttons
    const row = createSuggestionButtonRow(suggestion._id, suggestion.votes.upCount, suggestion.votes.downCount);

    await interaction.update({ components: [row] });

    eventBus.emit(EVENTS.SUGGESTION_CREATE, { guildId: interaction.guild.id, suggestionId: suggestion._id, userId: interaction.user.id });
  } catch (error) {
    await interaction.reply({
      content: `${EMOJIS.ERROR} Failed to vote: ${error.message}`,
      ephemeral: true,
    });
  }
}

/**
 * Handle suggestion downvote
 */
export async function handleSuggestionDownvote(interaction, client) {
  const suggestionId = interaction.customId.split('_')[2];

  try {
    const suggestion = await Suggestion.findById(suggestionId);

    if (!suggestion) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Suggestion not found.`,
        ephemeral: true,
      });
    }

    // Vote
    await suggestion.vote(interaction.user.id, 'down');

    // Update buttons
    const row = createSuggestionButtonRow(suggestion._id, suggestion.votes.upCount, suggestion.votes.downCount);

    await interaction.update({ components: [row] });
  } catch (error) {
    await interaction.reply({
      content: `${EMOJIS.ERROR} Failed to vote: ${error.message}`,
      ephemeral: true,
    });
  }
}

/**
 * Register suggestion button handlers
 */
export function registerSuggestionButtons(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('suggestion_upvote_')) {
      await handleSuggestionUpvote(interaction, client);
    } else if (interaction.customId.startsWith('suggestion_downvote_')) {
      await handleSuggestionDownvote(interaction, client);
    }
  });
}