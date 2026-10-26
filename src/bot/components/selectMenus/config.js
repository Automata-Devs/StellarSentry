/**
 * Config Select Menu Handler
 */
import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { getFeaturesSorted, FEATURE_CATEGORIES } from '../../../config/features.js';

/**
 * Create config feature select menu
 */
export function createConfigFeatureSelectMenu(features) {
  return new StringSelectMenuBuilder()
    .setCustomId('config_toggle_feature')
    .setPlaceholder('Select a feature to toggle...')
    .addOptions(features.map(feat => {
      const enabled = feat.enabled === true;
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${enabled ? 'Disable' : 'Enable'} ${feat.name}`)
        .setDescription(feat.description.substring(0, 100))
        .setValue(feat.key)
        .setEmoji(enabled ? '✅' : '❌');
    }));
}

/**
 * Handle config feature toggle
 */
export async function handleConfigFeatureToggle(interaction, client) {
  const featureKey = interaction.values[0];
  // The actual toggle is handled in the config command
  // This just acknowledges the selection
  const featureName = featureKey.charAt(0).toUpperCase() + featureKey.slice(1);

  await interaction.update({
    content: `Selected: **${featureName}**. Use the config command to toggle it.`,
    embeds: [],
    components: [],
  });
}

/**
 * Register config select menu handler
 */
export function registerConfigSelectMenu(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== 'config_toggle_feature') return;

    await handleConfigFeatureToggle(interaction, client);
  });
}