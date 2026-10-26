/**
 * Interaction Create Event - Main router for all interactions
 * Handles commands, buttons, select menus, modals, autocomplete, and context menus
 */
import { InteractionType, InteractionResponseType } from 'discord.js';
import { client } from '../../../core/client.js';
import { logger } from '../../../utils/logger.js';
import { eventBus, EVENTS } from '../../../core/eventBus.js';
import { isFeatureEnabled } from '../../../services/guild.service.js';
import { cooldowns } from '../../../core/cooldowns.js';
import { UserError, PermissionError } from '../../../utils/errors.js';

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction) {
    // Handle different interaction types
    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
        await handleCommand(interaction);
        break;
      case InteractionType.ApplicationCommandAutocomplete:
        await handleAutocomplete(interaction);
        break;
      case InteractionType.MessageComponent:
        await handleComponent(interaction);
        break;
      case InteractionType.ModalSubmit:
        await handleModal(interaction);
        break;
      case InteractionType.ApplicationCommand:
        // Context menus are also ApplicationCommand type but with different context
        if (interaction.isContextMenuCommand()) {
          await handleContextMenu(interaction);
        }
        break;
    }
  },
};

async function handleCommand(interaction) {
  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn({ command: interaction.commandName }, 'Unknown command');
    return interaction.reply({
      content: 'Unknown command. Please try again.',
      ephemeral: true,
    });
  }

  // Check if command is disabled for this guild
  if (interaction.guild) {
    const settings = await client.guildService?.getGuild(interaction.guild.id);
    if (settings?.commands?.disabledCommands?.includes(command.data.name)) {
      return interaction.reply({
        content: 'This command is disabled in this server.',
        ephemeral: true,
      });
    }
  }

  // Check guild-only
  if (command.guildOnly && !interaction.guild) {
    return interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }

  // Check user permissions
  if (command.permissions?.user?.length) {
    const missing = command.permissions.user.filter(p => !interaction.memberPermissions.has(p));
    if (missing.length > 0) {
      return interaction.reply({
        content: `You need the following permissions: ${missing.join(', ')}`,
        ephemeral: true,
      });
    }
  }

  // Check bot permissions
  if (command.permissions?.bot?.length && interaction.guild) {
    const missing = command.permissions.bot.filter(p => !interaction.guild.members.me.permissions.has(p));
    if (missing.length > 0) {
      return interaction.reply({
        content: `I need the following permissions: ${missing.join(', ')}`,
        ephemeral: true,
      });
    }
  }

  // Check feature flag
  if (command.category && interaction.guild) {
    const featureEnabled = await isFeatureEnabled(interaction.guild.id, command.category);
    if (!featureEnabled) {
      return interaction.reply({
        content: `The **${command.category}** feature is disabled in this server.`,
        ephemeral: true,
      });
    }
  }

  // Check cooldown
  const cooldownKey = `${interaction.guildId || 'dm'}-${interaction.user.id}-${command.data.name}`;
  const cooldown = cooldowns.get(cooldownKey);
  if (cooldown && Date.now() < cooldown) {
    const remaining = Math.ceil((cooldown - Date.now()) / 1000);
    return interaction.reply({
      content: `Please wait ${remaining}s before using this command again.`,
      ephemeral: true,
    });
  }

  try {
    // Defer reply for commands that might take longer
    const isDeferred = command.defer !== false;
    if (isDeferred && !interaction.replied && !interaction.deferred) {
      await interaction.deferReply({ ephemeral: command.ephemeral });
    }

    // Execute command
    await command.execute(interaction, client);

    // Set cooldown
    if (command.cooldown) {
      cooldowns.set(cooldownKey, Date.now() + command.cooldown * 1000);
    }

    logger.debug({
      command: command.data.name,
      user: interaction.user.tag,
      guild: interaction.guild?.name,
    }, 'Command executed');
  } catch (error) {
    // Handle different error types
    if (error instanceof UserError) {
      const content = error.message;
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content }).catch(() => {});
      } else {
        await interaction.reply({ content, ephemeral: true }).catch(() => {});
      }
    } else if (error instanceof PermissionError) {
      const content = error.message;
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content }).catch(() => {});
      } else {
        await interaction.reply({ content, ephemeral: true }).catch(() => {});
      }
    } else {
      logger.error({ err: error, command: command.data.name, user: interaction.user.tag }, 'Command error');

      const content = 'An error occurred while executing this command.';
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content }).catch(() => {});
      } else {
        await interaction.reply({ content, ephemeral: true }).catch(() => {});
      }
    }
  }
}

async function handleAutocomplete(interaction) {
  const command = client.commands.get(interaction.commandName);
  if (!command || !command.autocomplete) return;

  try {
    await command.autocomplete(interaction, client);
  } catch (error) {
    logger.error({ err: error, command: interaction.commandName }, 'Autocomplete error');
  }
}

async function handleComponent(interaction) {
  const [type, ...parts] = interaction.customId.split('_');

  try {
    if (type === 'button') {
      const buttonHandler = client.buttons.get(interaction.customId);
      if (buttonHandler) {
        await buttonHandler(interaction, client);
      } else {
        // Handle dynamic buttons (pagination, etc.)
        await handleDynamicButton(interaction, parts);
      }
    } else if (type === 'select') {
      const selectHandler = client.selectMenus.get(interaction.customId);
      if (selectHandler) {
        await selectHandler(interaction, client);
      }
    }
  } catch (error) {
    logger.error({ err: error, customId: interaction.customId }, 'Component error');

    const content = 'An error occurred while processing this interaction.';
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content }).catch(() => {});
    } else {
      await interaction.reply({ content, ephemeral: true }).catch(() => {});
    }
  }
}

async function handleDynamicButton(interaction, parts) {
  // This handles buttons with dynamic IDs like pagination, polls, etc.
  // The actual handlers are registered with the full customId in their respective commands
  // If we reach here, it means no specific handler was found
  logger.debug({ customId: interaction.customId }, 'No handler for dynamic button');
}

async function handleModal(interaction) {
  const modalHandler = client.modals.get(interaction.customId);
  if (modalHandler) {
    try {
      await modalHandler(interaction, client);
    } catch (error) {
      logger.error({ err: error, customId: interaction.customId }, 'Modal error');
      await interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
    }
  }
}

async function handleContextMenu(interaction) {
  const contextMenu = client.contextMenus.get(interaction.commandName);
  if (!contextMenu) return;

  try {
    await contextMenu.execute(interaction, client);
  } catch (error) {
    logger.error({ err: error, contextMenu: interaction.commandName }, 'Context menu error');
    await interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
  }
}