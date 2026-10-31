/**
 * Config Command - View and manage bot configuration
 */
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { guildService } from '../../services/guild.service.js';
import { getFeaturesSorted, FEATURE_CATEGORIES } from '../../config/features.js';

export default {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('View and manage server configuration')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current server configuration')
<<<<<<< HEAD
=======
        .addStringOption(option =>
          option.setName('detail')
            .setDescription('Configuration section to view (optional)')
            .setRequired(false)
            .addChoices(
              { name: 'Overview', value: 'overview' },
              { name: 'Features', value: 'features' },
              { name: 'Moderation', value: 'moderation' },
              { name: 'Welcome', value: 'welcome' },
              { name: 'Leveling', value: 'leveling' },
              { name: 'Economy', value: 'economy' }
            )
        )
>>>>>>> f652c8f (Initial Commit - 2)
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('features')
        .setDescription('Toggle server features')
<<<<<<< HEAD
=======
        .addStringOption(option =>
          option.setName('feature')
            .setDescription('Specific feature to toggle (optional - shows all if omitted)')
            .setRequired(false)
        )
>>>>>>> f652c8f (Initial Commit - 2)
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('commands')
        .setDescription('Enable/disable specific commands'
        )
        .addStringOption(option =>
          option.setName('command')
            .setDescription('Command to toggle')
            .setRequired(true)
<<<<<<< HEAD
            .setAutocomplete(true)
=======
>>>>>>> f652c8f (Initial Commit - 2)
        )
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable the command')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset server configuration to defaults')
        .addStringOption(option =>
          option.setName('confirm')
            .setDescription('Type "CONFIRM" to reset')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  category: 'admin',
  cooldown: 10,
  permissions: { user: ['ManageGuild'], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'view':
        await handleView(interaction);
        break;
      case 'features':
        await handleFeatures(interaction);
        break;
      case 'commands':
        await handleCommands(interaction);
        break;
      case 'reset':
        await handleReset(interaction);
        break;
    }
  },

  async autocomplete(interaction, client) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'command') {
      const commands = Array.from(client.commands.values())
        .filter(cmd => cmd.data.name.startsWith(focused.value))
        .slice(0, 25)
        .map(cmd => ({ name: cmd.data.name, value: cmd.data.name }));
      await interaction.respond(commands);
    }
<<<<<<< HEAD
=======
    if (focused.name === 'feature') {
      const { getFeaturesSorted } = await import('../../config/features.js');
      const features = getFeaturesSorted()
        .filter(f => f.name.toLowerCase().includes(focused.value.toLowerCase()))
        .slice(0, 25)
        .map(f => ({ name: f.name, value: f.key }));
      await interaction.respond(features);
    }
>>>>>>> f652c8f (Initial Commit - 2)
  },
};

async function handleView(interaction) {
  const settings = await guildService.getGuild(interaction.guild.id);
<<<<<<< HEAD
=======
  const detail = interaction.options.getString('detail') || 'overview';
>>>>>>> f652c8f (Initial Commit - 2)

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SETTINGS} ${interaction.guild.name} Configuration`)
    .setColor(COLORS.PRIMARY)
    .setThumbnail(interaction.guild.iconURL({ size: 256 }))
    .setTimestamp();

<<<<<<< HEAD
  // Features
  const features = settings?.features || {};
  const featureList = Object.entries(features).map(([key, enabled]) => {
    const emoji = enabled ? '✅' : '❌';
    return `${emoji} ${key}`;
  }).join(' | ');

  embed.addFields({ name: 'Features', value: featureList || 'None', inline: false });

  // Moderation
  const mod = settings?.moderation || {};
  if (mod.logChannel) embed.addFields({ name: 'Mod Log', value: `<#${mod.logChannel}>`, inline: true });
  if (mod.modRole) embed.addFields({ name: 'Mod Role', value: `<@&${mod.modRole}>`, inline: true });

  // Welcome
  const welcome = settings?.welcome || {};
  if (welcome.channel) embed.addFields({ name: 'Welcome Channel', value: `<#${welcome.channel}>`, inline: true });

  // Leveling
  const leveling = settings?.leveling || {};
  if (leveling.enabled) {
    embed.addFields({ name: 'Leveling', value: `XP: ${leveling.xpPerMessage}/msg | Cooldown: ${leveling.xpCooldown}s`, inline: true });
  }

  // Economy
  const economy = settings?.economy || {};
  if (economy.enabled) {
    embed.addFields({ name: 'Economy', value: `Daily: ${economy.dailyMin}-${economy.dailyMax} | Work: ${economy.workMin}-${economy.workMax}`, inline: true });
=======
  const addFeatureFields = () => {
    const features = settings?.features || {};
    const featureList = Object.entries(features).map(([key, enabled]) => {
      const emoji = enabled ? '✅' : '❌';
      return `${emoji} ${key}`;
    }).join(' | ');
    embed.addFields({ name: 'Features', value: featureList || 'None', inline: false });
  };

  const addModerationFields = () => {
    const mod = settings?.moderation || {};
    if (mod.logChannel) embed.addFields({ name: 'Mod Log', value: `<#${mod.logChannel}>`, inline: true });
    if (mod.modRole) embed.addFields({ name: 'Mod Role', value: `<@&${mod.modRole}>`, inline: true });
  };

  const addWelcomeFields = () => {
    const welcome = settings?.welcome || {};
    if (welcome.channel) embed.addFields({ name: 'Welcome Channel', value: `<#${welcome.channel}>`, inline: true });
  };

  const addLevelingFields = () => {
    const leveling = settings?.leveling || {};
    if (leveling.enabled) {
      embed.addFields({ name: 'Leveling', value: `XP: ${leveling.xpPerMessage}/msg | Cooldown: ${leveling.xpCooldown}s`, inline: true });
    }
  };

  const addEconomyFields = () => {
    const economy = settings?.economy || {};
    if (economy.enabled) {
      embed.addFields({ name: 'Economy', value: `Daily: ${economy.dailyMin}-${economy.dailyMax} | Work: ${economy.workMin}-${economy.workMax}`, inline: true });
    }
  };

  switch (detail) {
    case 'overview':
      addFeatureFields();
      addModerationFields();
      addWelcomeFields();
      addLevelingFields();
      addEconomyFields();
      break;
    case 'features':
      addFeatureFields();
      break;
    case 'moderation':
      addModerationFields();
      break;
    case 'welcome':
      addWelcomeFields();
      break;
    case 'leveling':
      addLevelingFields();
      break;
    case 'economy':
      addEconomyFields();
      break;
>>>>>>> f652c8f (Initial Commit - 2)
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleFeatures(interaction) {
  const settings = await guildService.getGuild(interaction.guild.id);
  const features = settings?.features || {};
<<<<<<< HEAD

  const sortedFeatures = getFeaturesSorted();
=======
  const specificFeature = interaction.options.getString('feature');

  const sortedFeatures = getFeaturesSorted();
  const featuresToShow = specificFeature
    ? sortedFeatures.filter(f => f.key === specificFeature)
    : sortedFeatures;

  if (specificFeature && featuresToShow.length === 0) {
    return interaction.reply({
      content: `${EMOJIS.ERROR} Feature not found.`,
      ephemeral: true,
    });
  }

  // If a specific feature is requested, toggle it directly
  if (specificFeature) {
    const feat = featuresToShow[0];
    const currentState = features[feat.key] === true;
    await guildService.toggleFeature(interaction.guild.id, feat.key, !currentState);

    return interaction.reply({
      content: `${currentState ? '❌ Disabled' : '✅ Enabled'} **${feat.name}**`,
      ephemeral: true,
    });
  }
>>>>>>> f652c8f (Initial Commit - 2)

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SETTINGS} Feature Toggles`)
    .setColor(COLORS.PRIMARY)
    .setDescription('Select a feature to toggle it on/off.')
    .setTimestamp();

  // Group by category
  const categories = {};
  for (const feature of sortedFeatures) {
    if (!categories[feature.category]) categories[feature.category] = [];
    categories[feature.category].push(feature);
  }

  let description = '';
  for (const [category, feats] of Object.entries(categories)) {
    const catInfo = FEATURE_CATEGORIES[category];
    description += `\n**${catInfo.icon} ${catInfo.name}**\n`;
    for (const feat of feats) {
      const enabled = features[feat.key] === true;
      description += `${enabled ? '✅' : '❌'} **${feat.name}** - ${feat.description}\n`;
    }
  }

  embed.setDescription(description.substring(0, 4096));

  // Create select menu for toggling
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('config_toggle_feature')
    .setPlaceholder('Select a feature to toggle...')
    .addOptions(sortedFeatures.map(feat => {
      const enabled = features[feat.key] === true;
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${enabled ? 'Disable' : 'Enable'} ${feat.name}`)
        .setDescription(feat.description.substring(0, 100))
        .setValue(feat.key)
        .setEmoji(enabled ? '✅' : '❌');
    }));

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true, ephemeral: true });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60000,
    filter: i => i.user.id === interaction.user.id,
  });

  collector.on('collect', async i => {
    const featureKey = i.values[0];
    const currentState = features[featureKey] === true;
    await guildService.toggleFeature(interaction.guild.id, featureKey, !currentState);

    // Update embed and respond
    await i.update({ content: `${currentState ? '❌ Disabled' : '✅ Enabled'} ${featureKey}`, embeds: [], components: [] });
    collector.stop();
  });
}

async function handleCommands(interaction) {
  const command = interaction.options.getString('command');
  const enabled = interaction.options.getBoolean('enabled');

  await guildService.updateSettings(interaction.guild.id, {
    [`commands.disabledCommands`]: enabled
      ? { $pull: { disabledCommands: command } }
      : { $addToSet: { disabledCommands: command } },
  });

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Command ${enabled ? 'Enabled' : 'Disabled'}`)
    .setColor(COLORS.SUCCESS)
    .setDescription(`${enabled ? '✅' : '❌'} Command \`/${command}\` has been ${enabled ? 'enabled' : 'disabled'}.`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleReset(interaction) {
  const confirm = interaction.options.getString('confirm');

  if (confirm !== 'CONFIRM') {
    return interaction.reply({
      content: `${EMOJIS.ERROR} You must type "CONFIRM" to reset the configuration.`,
      ephemeral: true,
    });
  }

  await guildService.resetGuild(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Configuration Reset`)
    .setColor(COLORS.SUCCESS)
    .setDescription('Server configuration has been reset to defaults.')
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}