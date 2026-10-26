/**
 * SuggestConfig Command - Configure suggestions system
 */
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { guildService } from '../../services/guild.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('suggest-config')
    .setDescription('Configure the suggestions system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Set up the suggestions system')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel for suggestions')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('log_channel')
            .setDescription('Channel for suggestion logs')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('Configure suggestion settings')
        .addBooleanOption(option =>
          option.setName('anonymous')
            .setDescription('Allow anonymous suggestions')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option.setName('approval_required')
            .setDescription('Require staff approval before posting')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option.setName('approval_role')
            .setDescription('Role that can approve suggestions')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('upvote_emoji')
            .setDescription('Custom upvote emoji')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('downvote_emoji')
            .setDescription('Custom downvote emoji')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current suggestion settings')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable the suggestions system')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  category: 'utility',
  cooldown: 10,
  permissions: { user: ['ManageGuild'], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'setup':
        await handleSetup(interaction);
        break;
      case 'settings':
        await handleSettings(interaction);
        break;
      case 'view':
        await handleView(interaction);
        break;
      case 'disable':
        await handleDisable(interaction);
        break;
    }
  },
};

async function handleSetup(interaction) {
  const channel = interaction.options.getChannel('channel');
  const logChannel = interaction.options.getChannel('log_channel');

  await guildService.updateSettings(interaction.guild.id, {
    'suggestions.enabled': true,
    'suggestions.channel': channel.id,
    'suggestions.logChannel': logChannel?.id || null,
  });

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Suggestions Configured`)
    .setColor(COLORS.SUCCESS)
    .addFields(
      { name: 'Suggestions Channel', value: `${channel}`, inline: true },
      { name: 'Log Channel', value: logChannel ? `${logChannel}` : 'Not set', inline: true },
      { name: 'Status', value: 'Enabled', inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleSettings(interaction) {
  const anonymous = interaction.options.getBoolean('anonymous');
  const approvalRequired = interaction.options.getBoolean('approval_required');
  const approvalRole = interaction.options.getRole('approval_role');
  const upvoteEmoji = interaction.options.getString('upvote_emoji');
  const downvoteEmoji = interaction.options.getString('downvote_emoji');

  const updates = {};
  if (anonymous !== null) updates['suggestions.anonymous'] = anonymous;
  if (approvalRequired !== null) updates['suggestions.approval.required'] = approvalRequired;
  if (approvalRole) updates['suggestions.approval.roles'] = [approvalRole.id];
  if (upvoteEmoji) updates['suggestions.voting.upvoteEmoji'] = upvoteEmoji;
  if (downvoteEmoji) updates['suggestions.voting.downvoteEmoji'] = downvoteEmoji;

  await guildService.updateSettings(interaction.guild.id, updates);

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Suggestion Settings Updated`)
    .setColor(COLORS.SUCCESS)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleView(interaction) {
  const settings = await guildService.getGuild(interaction.guild.id);
  const s = settings?.suggestions || {};

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SUGGESTION} Suggestion Settings`)
    .setColor(COLORS.INFO)
    .addFields(
      { name: 'Enabled', value: s.enabled ? 'Yes' : 'No', inline: true },
      { name: 'Channel', value: s.channel ? `<#${s.channel}>` : 'Not set', inline: true },
      { name: 'Log Channel', value: s.logChannel ? `<#${s.logChannel}>` : 'Not set', inline: true },
      { name: 'Anonymous', value: s.anonymous ? 'Yes' : 'No', inline: true },
      { name: 'Approval Required', value: s.approval?.required ? 'Yes' : 'No', inline: true },
      { name: 'Approval Roles', value: s.approval?.roles?.length ? s.approval.roles.map(r => `<@&${r}>`).join(', ') : 'None', inline: true },
      { name: 'Upvote Emoji', value: s.voting?.upvoteEmoji || '👍', inline: true },
      { name: 'Downvote Emoji', value: s.voting?.downvoteEmoji || '👎', inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleDisable(interaction) {
  await guildService.updateSettings(interaction.guild.id, {
    'suggestions.enabled': false,
  });

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.SUCCESS} Suggestions Disabled`)
    .setColor(COLORS.SUCCESS)
    .setDescription('The suggestions system has been disabled for this server.')
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}