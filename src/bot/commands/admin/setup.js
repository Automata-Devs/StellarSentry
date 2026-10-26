/**
 * Setup Command - Interactive setup wizard for the bot
 */
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { guildService } from '../../services/guild.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Run the interactive setup wizard')
    .addSubcommand(subcommand =>
      subcommand
        .setName('moderation')
        .setDescription('Set up moderation system')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('welcome')
        .setDescription('Set up welcome system')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leveling')
        .setDescription('Set up leveling system')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('economy')
        .setDescription('Set up economy system')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('tickets')
        .setDescription('Set up ticket system')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('starboard')
        .setDescription('Set up starboard')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('giveaways')
        .setDescription('Set up giveaways')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('suggestions')
        .setDescription('Set up suggestions')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('logging')
        .setDescription('Set up logging')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('full')
        .setDescription('Run full server setup wizard')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  category: 'admin',
  cooldown: 15,
  permissions: { user: ['ManageGuild'], bot: ['SendMessages', 'EmbedLinks', 'ManageChannels', 'ManageRoles'] },
  guildOnly: true,

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ ephemeral: true });

    try {
      switch (subcommand) {
        case 'moderation':
          await setupModeration(interaction);
          break;
        case 'welcome':
          await setupWelcome(interaction);
          break;
        case 'leveling':
          await setupLeveling(interaction);
          break;
        case 'economy':
          await setupEconomy(interaction);
          break;
        case 'tickets':
          await setupTickets(interaction);
          break;
        case 'starboard':
          await setupStarboard(interaction);
          break;
        case 'giveaways':
          await setupGiveaways(interaction);
          break;
        case 'suggestions':
          await setupSuggestions(interaction);
          break;
        case 'logging':
          await setupLogging(interaction);
          break;
        case 'full':
          await setupFull(interaction);
          break;
      }
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Setup failed: ${error.message}`,
      });
    }
  },
};

async function setupModeration(interaction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.MODERATION} Moderation Setup`)
    .setColor(COLORS.PRIMARY)
    .setDescription('Configure moderation settings for your server.')
    .addFields(
      { name: 'Log Channel', value: 'Channel for moderation logs', inline: true },
      { name: 'Mod Role', value: 'Role with moderation permissions', inline: true },
      { name: 'Mute Role', value: 'Role for timed out users', inline: true },
      { name: 'DM on Action', value: 'Send DM when user is moderated', inline: true },
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_mod_log').setLabel('Set Log Channel').setStyle(ButtonStyle.Primary).setEmoji('📝'),
    new ButtonBuilder().setCustomId('setup_mod_role').setLabel('Set Mod Role').setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
    new ButtonBuilder().setCustomId('setup_mute_role').setLabel('Set Mute Role').setStyle(ButtonStyle.Primary).setEmoji('🔇'),
    new ButtonBuilder().setCustomId('setup_mod_dm').setLabel('Toggle DM').setStyle(ButtonStyle.Secondary).setEmoji('📬'),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function setupWelcome(interaction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.WELCOME} Welcome Setup`)
    .setColor(COLORS.PRIMARY)
    .setDescription('Configure welcome and leave messages.')
    .addFields(
      { name: 'Welcome Channel', value: 'Channel for welcome messages', inline: true },
      { name: 'Leave Channel', value: 'Channel for leave messages', inline: true },
      { name: 'Auto Roles', value: 'Roles given on join', inline: true },
      { name: 'Embed', value: 'Use embed for welcome message', inline: true },
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_welcome_channel').setLabel('Welcome Channel').setStyle(ButtonStyle.Primary).setEmoji('👋'),
    new ButtonBuilder().setCustomId('setup_leave_channel').setLabel('Leave Channel').setStyle(ButtonStyle.Primary).setEmoji('👋'),
    new ButtonBuilder().setCustomId('setup_autoroles').setLabel('Auto Roles').setStyle(ButtonStyle.Primary).setEmoji('🎭'),
    new ButtonBuilder().setCustomId('setup_welcome_embed').setLabel('Toggle Embed').setStyle(ButtonStyle.Secondary).setEmoji('📋'),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function setupLeveling(interaction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.LEVELING} Leveling Setup`)
    .setColor(COLORS.LEVELING)
    .setDescription('Configure XP and leveling system.')
    .addFields(
      { name: 'XP per Message', value: 'Amount of XP gained per message', inline: true },
      { name: 'XP Cooldown', value: 'Seconds between XP gains', inline: true },
      { name: 'Level Up Channel', value: 'Channel for level up announcements', inline: true },
      { name: 'Role Rewards', value: 'Roles given at specific levels', inline: true },
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_xp_amount').setLabel('XP per Message').setStyle(ButtonStyle.Primary).setEmoji('✨'),
    new ButtonBuilder().setCustomId('setup_xp_cooldown').setLabel('XP Cooldown').setStyle(ButtonStyle.Primary).setEmoji('⏱️'),
    new ButtonBuilder().setCustomId('setup_level_channel').setLabel('Level Up Channel').setStyle(ButtonStyle.Primary).setEmoji('📢'),
    new ButtonBuilder().setCustomId('setup_role_rewards').setLabel('Role Rewards').setStyle(ButtonStyle.Primary).setEmoji('🎭'),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function setupEconomy(interaction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.ECONOMY} Economy Setup`)
    .setColor(COLORS.ECONOMY)
    .setDescription('Configure economy system.')
    .addFields(
      { name: 'Starting Balance', value: 'Initial balance for new users', inline: true },
      { name: 'Daily Range', value: 'Min/Max daily reward', inline: true },
      { name: 'Work Range', value: 'Min/Max work reward', inline: true },
      { name: 'Shop', value: 'Items for purchase', inline: true },
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_start_balance').setLabel('Starting Balance').setStyle(ButtonStyle.Primary).setEmoji('💰'),
    new ButtonBuilder().setCustomId('setup_daily_range').setLabel('Daily Range').setStyle(ButtonStyle.Primary).setEmoji('📅'),
    new ButtonBuilder().setCustomId('setup_work_range').setLabel('Work Range').setStyle(ButtonStyle.Primary).setEmoji('💼'),
    new ButtonBuilder().setCustomId('setup_shop').setLabel('Manage Shop').setStyle(ButtonStyle.Primary).setEmoji('🛒'),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function setupTickets(interaction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.TICKET} Tickets Setup`)
    .setColor(COLORS.PRIMARY)
    .setDescription('Configure support ticket system.')
    .addFields(
      { name: 'Category', value: 'Category for ticket channels', inline: true },
      { name: 'Support Role', value: 'Role that can view/manage tickets', inline: true },
      { name: 'Log Channel', value: 'Channel for ticket logs', inline: true },
      { name: 'Panel', value: 'Button panel for creating tickets', inline: true },
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_ticket_category').setLabel('Category').setStyle(ButtonStyle.Primary).setEmoji('📁'),
    new ButtonBuilder().setCustomId('setup_support_role').setLabel('Support Role').setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
    new ButtonBuilder().setCustomId('setup_ticket_log').setLabel('Log Channel').setStyle(ButtonStyle.Primary).setEmoji('📝'),
    new ButtonBuilder().setCustomId('setup_ticket_panel').setLabel('Create Panel').setStyle(ButtonStyle.Success).setEmoji('🎫'),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function setupStarboard(interaction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.STARBOARD} Starboard Setup`)
    .setColor(COLORS.STARBOARD)
    .setDescription('Configure starboard for popular messages.')
    .addFields(
      { name: 'Channel', value: 'Channel for starred messages', inline: true },
      { name: 'Emoji', value: 'Emoji to react with', inline: true },
      { name: 'Threshold', value: 'Minimum reactions required', inline: true },
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_star_channel').setLabel('Starboard Channel').setStyle(ButtonStyle.Primary).setEmoji('⭐'),
    new ButtonBuilder().setCustomId('setup_star_emoji').setLabel('Star Emoji').setStyle(ButtonStyle.Primary).setEmoji('🌟'),
    new ButtonBuilder().setCustomId('setup_star_threshold').setLabel('Threshold').setStyle(ButtonStyle.Primary).setEmoji('🔢'),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function setupGiveaways(interaction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.GIVEAWAY} Giveaways Setup`)
    .setColor(COLORS.PRIMARY)
    .setDescription('Configure giveaway system.')
    .addFields(
      { name: 'Manager Role', value: 'Role that can manage giveaways', inline: true },
      { name: 'Requirements', value: 'Role/Level requirements to enter', inline: true },
      { name: 'Blacklisted Roles', value: 'Roles that cannot enter', inline: true },
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_giveaway_manager').setLabel('Manager Role').setStyle(ButtonStyle.Primary).setEmoji('🎉'),
    new ButtonBuilder().setCustomId('setup_giveaway_req').setLabel('Requirements').setStyle(ButtonStyle.Primary).setEmoji('📋'),
    new ButtonBuilder().setCustomId('setup_giveaway_blacklist').setLabel('Blacklist').setStyle(ButtonStyle.Primary).setEmoji('🚫'),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function setupSuggestions(interaction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SUGGESTION} Suggestions Setup`)
    .setColor(COLORS.PRIMARY)
    .setDescription('Configure community suggestions.')
    .addFields(
      { name: 'Channel', value: 'Channel for suggestions', inline: true },
      { name: 'Log Channel', value: 'Channel for suggestion logs', inline: true },
      { name: 'Anonymous', value: 'Allow anonymous suggestions', inline: true },
      { name: 'Approval', value: 'Require staff approval', inline: true },
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_suggest_channel').setLabel('Suggestion Channel').setStyle(ButtonStyle.Primary).setEmoji('💡'),
    new ButtonBuilder().setCustomId('setup_suggest_log').setLabel('Log Channel').setStyle(ButtonStyle.Primary).setEmoji('📝'),
    new ButtonBuilder().setCustomId('setup_suggest_anon').setLabel('Toggle Anonymous').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
    new ButtonBuilder().setCustomId('setup_suggest_approval').setLabel('Toggle Approval').setStyle(ButtonStyle.Secondary).setEmoji('✅'),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function setupLogging(interaction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.LOG} Logging Setup`)
    .setColor(COLORS.PRIMARY)
    .setDescription('Configure audit logging for server events.')
    .addFields(
      { name: 'Categories', value: 'Enable/disable log categories', inline: true },
      { name: 'Channels', value: 'Set channels for each category', inline: true },
      { name: 'Ignored', value: 'Channels/roles to ignore', inline: true },
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_log_categories').setLabel('Categories').setStyle(ButtonStyle.Primary).setEmoji('📋'),
    new ButtonBuilder().setCustomId('setup_log_channels').setLabel('Channels').setStyle(ButtonStyle.Primary).setEmoji('📢'),
    new ButtonBuilder().setCustomId('setup_log_ignored').setLabel('Ignored').setStyle(ButtonStyle.Primary).setEmoji('🚫'),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function setupFull(interaction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SETTINGS} Full Server Setup Wizard`)
    .setColor(COLORS.PRIMARY)
    .setDescription('This will guide you through setting up all major features for your server.')
    .addFields(
      { name: '1️⃣ Moderation', value: 'Log channel, mod role, mute role', inline: true },
      { name: '2️⃣ Welcome', value: 'Welcome/leave messages, auto-roles', inline: true },
      { name: '3️⃣ Leveling', value: 'XP rates, rewards, announcements', inline: true },
      { name: '4️⃣ Economy', value: 'Currency, shop, daily rewards', inline: true },
      { name: '5️⃣ Tickets', value: 'Support system, categories, panel', inline: true },
      { name: '6️⃣ Starboard', value: 'Popular messages highlight', inline: true },
      { name: '7️⃣ Giveaways', value: 'Giveaway management', inline: true },
      { name: '8️⃣ Suggestions', value: 'Community feedback system', inline: true },
      { name: '9️⃣ Logging', value: 'Audit logs for all events', inline: true },
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup_start_moderation').setLabel('Start Moderation').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
    new ButtonBuilder().setCustomId('setup_skip_moderation').setLabel('Skip').setStyle(ButtonStyle.Secondary).setEmoji('⏭️'),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}