/**
 * Help Select Menu Handler
 */
import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, EmbedBuilder, ComponentType } from 'discord.js';
import { COLORS, EMOJIS } from '../../../config/constants.js';
import { client } from '../../../core/client.js';

/**
 * Create help category select menu
 */
export function createHelpSelectMenu(categories) {
  return new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('Select a category...')
    .addOptions(categories.map(([category, commands]) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(category.charAt(0).toUpperCase() + category.slice(1))
        .setDescription(`${commands.length} commands`)
        .setValue(category)
        .setEmoji(getCategoryEmoji(category))
    ));
}

/**
 * Handle help category select
 */
export async function handleHelpSelect(interaction) {
  const category = interaction.values[0];
  const commands = Array.from(client.commands.values())
    .filter(cmd => cmd.category === category);

  const embed = new EmbedBuilder()
    .setTitle(`${getCategoryEmoji(category)} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
    .setColor(COLORS.PRIMARY)
    .setDescription(commands.map(c => `**/${c.data.name}** - ${c.data.description || 'No description'}`).join('\n'))
    .setTimestamp();

  await interaction.update({ embeds: [embed] });
}

/**
 * Register help select menu handler
 */
export function registerHelpSelectMenu(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== 'help_category_select') return;

    await handleHelpSelect(interaction);
  });
}

function getCategoryEmoji(category) {
  const emojis = {
    general: 'ℹ️',
    moderation: '🛡️',
    utility: '🔧',
    fun: '🎮',
    economy: '💰',
    leveling: '📊',
    tickets: '🎫',
    giveaways: '🎉',
    suggestions: '💡',
    starboard: '⭐',
    music: '🎵',
    admin: '⚙️',
    uncategorized: '📦',
  };
  return emojis[category] || '📦';
}