/**
 * Purge Command - Delete messages in bulk
 */
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { moderationService } from '../../services/moderation.service.js';
import { guildService } from '../../services/guild.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete messages in bulk')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription(`Number of messages to delete (1-${LIMITS.PURGE_MAX})`)
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(LIMITS.PURGE_MAX)
    )
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('contains')
        .setDescription('Only delete messages containing this text')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('bots')
        .setDescription('Only delete messages from bots')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to purge (defaults to current channel)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  category: 'moderation',
  cooldown: 10,
  permissions: { user: ['ManageMessages'], bot: ['ManageMessages', 'ReadMessageHistory'] },
  guildOnly: true,

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');
    const contains = interaction.options.getString('contains');
    const bots = interaction.options.getBoolean('bots');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!channel.isTextBased()) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} This command can only be used in text channels.`,
      });
    }

    // Check bot permissions
    if (!channel.permissionsFor(client.user).has('ManageMessages')) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} I don't have permission to manage messages in that channel.`,
      });
    }

    if (!channel.permissionsFor(client.user).has('ReadMessageHistory')) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} I don't have permission to read message history in that channel.`,
      });
    }

    try {
      const filter = {};
      if (user) filter.user = user.id;
      if (contains) filter.contains = contains;
      if (bots !== undefined) filter.bots = bots;

      const result = await moderationService.purge({
        channel,
        moderator: interaction.member,
        amount,
        filter,
      });

      const settings = await guildService.getGuild(interaction.guild.id);
      const caseNumber = settings?.moderation?.caseNumber || 0;

      await interaction.editReply({
        embeds: [{
          title: `${EMOJIS.SUCCESS} Messages Purged`,
          color: COLORS.SUCCESS,
          fields: [
            { name: 'Channel', value: `${channel}`, inline: true },
            { name: 'Deleted', value: result.deleted.toString(), inline: true },
            { name: 'Case', value: `#${caseNumber}`, inline: true },
          ],
          timestamp: new Date(),
          footer: { text: `StellarSentry Moderation` },
        }],
      });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to purge messages: ${error.message}`,
      });
    }
  },
};