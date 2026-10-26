/**
 * Lock Command - Lock a channel (disable SendMessages for @everyone)
 */
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { moderationService } from '../../services/moderation.service.js';
import { guildService } from '../../services/guild.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel (prevent @everyone from sending messages)')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to lock (defaults to current channel)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for locking the channel')
        .setRequired(false)
        .setMaxLength(512)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  category: 'moderation',
  cooldown: 5,
  permissions: { user: ['ManageChannels'], bot: ['ManageChannels'] },
  guildOnly: true,

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: false });

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason');

    if (!channel.isTextBased()) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} This command can only be used in text channels.`,
      });
    }

    // Check bot permissions
    if (!channel.permissionsFor(client.user).has('ManageChannels')) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} I don't have permission to manage that channel.`,
      });
    }

    // Check if already locked
    const everyoneRole = channel.guild.roles.everyone;
    const overwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);
    if (overwrite && overwrite.deny.has('SendMessages')) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} This channel is already locked.`,
      });
    }

    try {
      await moderationService.lock({
        channel,
        moderator: interaction.member,
        reason,
      });

      const settings = await guildService.getGuild(interaction.guild.id);
      const caseNumber = settings?.moderation?.caseNumber || 0;

      await interaction.editReply({
        embeds: [{
          title: `${EMOJIS.LOCK} Channel Locked`,
          color: COLORS.ERROR,
          fields: [
            { name: 'Channel', value: `${channel}`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Case', value: `#${caseNumber}`, inline: true },
            { name: 'Reason', value: reason || 'No reason provided', inline: false },
          ],
          timestamp: new Date(),
          footer: { text: `StellarSentry Moderation` },
        }],
      });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to lock channel: ${error.message}`,
      });
    }
  },
};