/**
 * Reload Command - Reload commands, events, or components
 */
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { loadCommands, reloadCommand, unloadCommand } from '../../loaders/commandLoader.js';
import { loadEvents, reloadEvent } from '../../loaders/eventLoader.js';
import { loadComponents } from '../../loaders/componentLoader.js';
import { client } from '../../core/client.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Reload bot components')
    .addSubcommand(subcommand =>
      subcommand
        .setName('commands')
        .setDescription('Reload all commands or a specific command')
        .addStringOption(option =>
          option.setName('command')
            .setDescription('Specific command to reload (optional)')
            .setRequired(false)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('events')
        .setDescription('Reload all events or a specific event')
        .addStringOption(option =>
          option.setName('event')
            .setDescription('Specific event to reload (optional)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('components')
        .setDescription('Reload all components (buttons, select menus, modals)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('all')
        .setDescription('Reload everything (commands, events, components)')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  category: 'admin',
  cooldown: 10,
  permissions: { user: ['Administrator'], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ ephemeral: true });

    try {
      switch (subcommand) {
        case 'commands':
          await handleCommandsReload(interaction);
          break;
        case 'events':
          await handleEventsReload(interaction);
          break;
        case 'components':
          await handleComponentsReload(interaction);
          break;
        case 'all':
          await handleAllReload(interaction);
          break;
      }
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Reload failed: ${error.message}`,
      });
    }
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'command') {
      const commands = Array.from(client.commands.values())
        .filter(cmd => cmd.data.name.startsWith(focused.value))
        .slice(0, 25)
        .map(cmd => ({ name: cmd.data.name, value: cmd.data.name }));
      await interaction.respond(commands);
    }
  },
};

async function handleCommandsReload(interaction) {
  const commandName = interaction.options.getString('command');

  if (commandName) {
    const success = await reloadCommand(commandName);
    const embed = new EmbedBuilder()
      .setTitle(success ? `${EMOJIS.SUCCESS} Command Reloaded` : `${EMOJIS.ERROR} Reload Failed`)
      .setColor(success ? COLORS.SUCCESS : COLORS.ERROR)
      .setDescription(success
        ? `Command \`/${commandName}\` has been reloaded.`
        : `Failed to reload command \`/${commandName}\`. It may not exist.`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } else {
    // Reload all commands
    client.commands.clear();
    client.buttons.clear();
    client.selectMenus.clear();
    client.modals.clear();
    client.contextMenus.clear();
    client.autocompleteHandlers.clear();

    const loaded = await loadCommands();

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.SUCCESS} All Commands Reloaded`)
      .setColor(COLORS.SUCCESS)
      .setDescription(`Reloaded **${loaded}** commands.`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleEventsReload(interaction) {
  const eventName = interaction.options.getString('event');

  if (eventName) {
    const success = await reloadEvent(eventName);
    const embed = new EmbedBuilder()
      .setTitle(success ? `${EMOJIS.SUCCESS} Event Reloaded` : `${EMOJIS.ERROR} Reload Failed`)
      .setColor(success ? COLORS.SUCCESS : COLORS.ERROR)
      .setDescription(success
        ? `Event \`${eventName}\` has been reloaded.`
        : `Failed to reload event \`${eventName}\`. It may not exist.`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } else {
    // Reload all events
    client.removeAllListeners();
    const loaded = await loadEvents();

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.SUCCESS} All Events Reloaded`)
      .setColor(COLORS.SUCCESS)
      .setDescription(`Reloaded **${loaded}** events.`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleComponentsReload(interaction) {
  client.buttons.clear();
  client.selectMenus.clear();
  client.modals.clear();

  const loaded = await loadComponents();

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} All Components Reloaded`)
    .setColor(COLORS.SUCCESS)
    .setDescription(`Reloaded **${loaded.buttons}** buttons, **${loaded.selectMenus}** select menus, and **${loaded.modals}** modals.`)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleAllReload(interaction) {
  client.commands.clear();
  client.buttons.clear();
  client.selectMenus.clear();
  client.modals.clear();
  client.contextMenus.clear();
  client.autocompleteHandlers.clear();
  client.removeAllListeners();

  const [commands, events, components] = await Promise.all([
    loadCommands(),
    loadEvents(),
    loadComponents(),
  ]);

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Full Reload Complete`)
    .setColor(COLORS.SUCCESS)
    .addFields(
      { name: 'Commands', value: commands.toString(), inline: true },
      { name: 'Events', value: events.toString(), inline: true },
      { name: 'Components', value: `${components.buttons} buttons, ${components.selectMenus} select menus, ${components.modals} modals`, inline: true },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}