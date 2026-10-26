/**
 * Help Command - Display all available commands with pagination
 */
import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { client } from '../../core/client.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display all available commands')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('Get detailed help for a specific command')
        .setRequired(false)
        .setAutocomplete(true)
    ),

  category: 'general',
  cooldown: 10,
  permissions: { user: [], bot: [] },
  guildOnly: false,

  async execute(interaction, client) {
    const commandName = interaction.options.getString('command');

    // If specific command requested, show detailed help
    if (commandName) {
      const command = client.commands.get(commandName);
      if (!command) {
        return interaction.reply({
          content: `${EMOJIS.ERROR} Command not found: \`${commandName}\``,
          ephemeral: true,
        });
      }
      return showCommandHelp(interaction, command);
    }

    // Otherwise show categorized help menu
    await showHelpMenu(interaction, client);
  },

  async autocomplete(interaction, client) {
    const focused = interaction.options.getFocused(true);
    const commands = Array.from(client.commands.values())
      .filter(cmd => cmd.data.name.startsWith(focused.value))
      .slice(0, 25)
      .map(cmd => ({ name: cmd.data.name, value: cmd.data.name }));

    await interaction.respond(commands);
  },
};

async function showHelpMenu(interaction, client) {
  // Group commands by category
  const categories = new Map();

  for (const command of client.commands.values()) {
    const category = command.category || 'uncategorized';
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category).push(command);
  }

  // Sort categories
  const categoryOrder = ['general', 'moderation', 'utility', 'fun', 'economy', 'leveling', 'tickets', 'giveaways', 'suggestions', 'starboard', 'music', 'admin'];
  const sortedCategories = Array.from(categories.entries()).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a[0]);
    const bIndex = categoryOrder.indexOf(b[0]);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  // Create embed
  const embed = {
    title: `${EMOJIS.INFO} StellarSentry Help Menu`,
    color: COLORS.PRIMARY,
    description: `Use the dropdown below to browse commands by category.\nTotal commands: **${client.commands.size}**`,
    fields: [],
    timestamp: new Date(),
    footer: { text: `StellarSentry • Page 1 of ${sortedCategories.length}` },
  };

  // Add summary fields
  for (const [category, commands] of sortedCategories) {
    const emoji = getCategoryEmoji(category);
    embed.fields.push({
      name: `${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
      value: commands.map(c => `\`/${c.data.name}\``).join(', '),
      inline: true,
    });
  }

  // Create select menu
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('Select a category...')
    .addOptions(sortedCategories.map(([category, commands], index) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(category.charAt(0).toUpperCase() + category.slice(1))
        .setDescription(`${commands.length} commands`)
        .setValue(category)
        .setEmoji(getCategoryEmoji(category))
    ));

  // Create navigation buttons
  const prevButton = new ButtonBuilder()
    .setCustomId('help_prev')
    .setLabel('Previous')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const nextButton = new ButtonBuilder()
    .setCustomId('help_next')
    .setLabel('Next')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(sortedCategories.length <= 1);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(prevButton, nextButton);

  const reply = await interaction.reply({
    embeds: [embed],
    components: [row1, row2],
    fetchReply: true,
  });

  // Handle interactions
  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect | ComponentType.Button,
    time: 300000, // 5 minutes
    filter: i => i.user.id === interaction.user.id,
  });

  let currentIndex = 0;

  collector.on('collect', async i => {
    if (i.isStringSelectMenu()) {
      const category = i.values[0];
      currentIndex = sortedCategories.findIndex(([cat]) => cat === category);
      await updateHelpEmbed(i, sortedCategories, currentIndex);
    } else if (i.isButton()) {
      if (i.customId === 'help_prev' && currentIndex > 0) {
        currentIndex--;
        await updateHelpEmbed(i, sortedCategories, currentIndex);
      } else if (i.customId === 'help_next' && currentIndex < sortedCategories.length - 1) {
        currentIndex++;
        await updateHelpEmbed(i, sortedCategories, currentIndex);
      }
    }
  });

  collector.on('end', async () => {
    const disabledRow1 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('help_category_select_disabled').setPlaceholder('Expired').setDisabled(true).addOptions(selectMenu.options)
    );
    const disabledRow2 = new ActionRowBuilder().addComponents(
      prevButton.setDisabled(true),
      nextButton.setDisabled(true)
    );
    await interaction.editReply({ components: [disabledRow1, disabledRow2] }).catch(() => {});
  });
}

async function updateHelpEmbed(interaction, sortedCategories, index) {
  const [category, commands] = sortedCategories[index];

  const embed = {
    title: `${getCategoryEmoji(category)} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`,
    color: COLORS.PRIMARY,
    description: commands.map(c => `**/${c.data.name}** - ${c.data.description || 'No description'}`).join('\n'),
    timestamp: new Date(),
    footer: { text: `StellarSentry • Category ${index + 1} of ${sortedCategories.length}` },
  };

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('Select a category...')
    .addOptions(sortedCategories.map(([cat, cmds], i) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(cat.charAt(0).toUpperCase() + cat.slice(1))
        .setDescription(`${cmds.length} commands`)
        .setValue(cat)
        .setEmoji(getCategoryEmoji(cat))
        .setDefault(i === index)
    ));

  const prevButton = new ButtonBuilder()
    .setCustomId('help_prev')
    .setLabel('Previous')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(index === 0);

  const nextButton = new ButtonBuilder()
    .setCustomId('help_next')
    .setLabel('Next')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(index === sortedCategories.length - 1);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(prevButton, nextButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

async function showCommandHelp(interaction, command) {
  const embed = {
    title: `${EMOJIS.INFO} Help: /${command.data.name}`,
    color: COLORS.PRIMARY,
    description: command.data.description || 'No description available',
    fields: [
      { name: 'Category', value: command.category || 'Uncategorized', inline: true },
      { name: 'Cooldown', value: `${command.cooldown || 5}s`, inline: true },
      { name: 'Guild Only', value: command.guildOnly ? 'Yes' : 'No', inline: true },
    ],
    timestamp: new Date(),
    footer: { text: `Requested by ${interaction.user.tag}` },
  };

  // Add permissions if any
  if (command.permissions?.user?.length || command.permissions?.bot?.length) {
    const userPerms = command.permissions.user?.map(p => `\`${p}\``).join(', ') || 'None';
    const botPerms = command.permissions.bot?.map(p => `\`${p}\``).join(', ') || 'None';
    embed.fields.push(
      { name: 'User Permissions', value: userPerms, inline: true },
      { name: 'Bot Permissions', value: botPerms, inline: true },
    );
  }

  // Add subcommands if any
  if (command.data.options && command.data.options.length > 0) {
    const subcommands = command.data.options.filter(o => o.type === 1); // SUB_COMMAND
    if (subcommands.length > 0) {
      embed.fields.push({
        name: 'Subcommands',
        value: subcommands.map(sc => `\`${sc.name}\` - ${sc.description}`).join('\n'),
        inline: false,
      });
    }
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
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