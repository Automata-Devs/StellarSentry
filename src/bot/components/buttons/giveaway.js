/**
 * Giveaway Button Handlers
 */
import { ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { giveawayRepository } from '../../../database/repositories/GiveawayRepository.js';
import { eventBus, EVENTS } from '../../../core/eventBus.js';

/**
 * Giveaway enter button
 */
export const giveawayEnterButton = new ButtonBuilder()
  .setCustomId('giveaway_enter')
  .setLabel('Enter Giveaway')
  .setStyle(ButtonStyle.Success)
  .setEmoji('🎉');

/**
 * Handle giveaway enter button
 */
export async function handleGiveawayEnter(interaction, client) {
  const messageId = interaction.message.id;

  try {
    const giveaway = await giveawayRepository.getByMessageId(messageId);

    if (!giveaway) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} Giveaway not found.`,
        ephemeral: true,
      });
    }

    if (giveaway.status !== 'active') {
      return interaction.reply({
        content: `${EMOJIS.ERROR} This giveaway is not active.`,
        ephemeral: true,
      });
    }

    // Check requirements
    if (giveaway.requirements?.requiredRole) {
      if (!interaction.member.roles.cache.has(giveaway.requirements.requiredRole)) {
        return interaction.reply({
          content: `${EMOJIS.ERROR} You need the required role to enter this giveaway.`,
          ephemeral: true,
        });
      }
    }

    if (giveaway.requirements?.requiredLevel) {
      // Would check user level here
    }

    if (giveaway.requirements?.accountAge) {
      const accountAge = Date.now() - interaction.user.createdTimestamp;
      if (accountAge < giveaway.requirements.accountAge) {
        return interaction.reply({
          content: `${EMOJIS.ERROR} Your account is not old enough to enter this giveaway.`,
          ephemeral: true,
        });
      }
    }

    if (giveaway.requirements?.serverAge) {
      const member = interaction.guild.members.cache.get(interaction.user.id);
      if (member) {
        const serverAge = Date.now() - member.joinedTimestamp;
        if (serverAge < giveaway.requirements.serverAge) {
          return interaction.reply({
            content: `${EMOJIS.ERROR} You haven't been in this server long enough to enter.`,
            ephemeral: true,
          });
        }
      }
    }

    // Check blacklisted roles
    if (giveaway.blacklistedRoles?.some(r => interaction.member.roles.cache.has(r))) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} You cannot enter this giveaway.`,
        ephemeral: true,
      });
    }

    // Add entry
    const updated = await giveawayRepository.addEntry(messageId, interaction.user.id);

    if (!updated) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} You have already entered this giveaway.`,
        ephemeral: true,
      });
    }

    eventBus.emit(EVENTS.GIVEAWAY_ENTRY, { guildId: interaction.guild.id, giveawayId: giveaway._id, userId: interaction.user.id });

    await interaction.reply({
      content: `${EMOJIS.SUCCESS} You have entered the giveaway! Good luck!`,
      ephemeral: true,
    });
  } catch (error) {
    await interaction.reply({
      content: `${EMOJIS.ERROR} Failed to enter giveaway: ${error.message}`,
      ephemeral: true,
    });
  }
}

/**
 * Register giveaway button handlers
 */
export function registerGiveawayButtons(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'giveaway_enter') {
      await handleGiveawayEnter(interaction, client);
    }
  });
}