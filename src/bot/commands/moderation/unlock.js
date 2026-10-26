/**
 * Unlock Command - Unlock a channel (restore SendMessages for @everyone)
 */
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { moderationService } from '../../services/moderation.service.js';
import { guildService } from '../../services/guild.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel (restore @everyone send messages permission)')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to unlock (defaults to current channel)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for unlocking the channel')
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

    // Check if already unlocked
    const everyoneRole = channel.guild.roles.everyone;
    const overwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);
    if (!overwrite || !overwrite.deny.has('SendMessages')) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} This channel is not locked.`,
      });
    }

    try {
      await moderationService.unlock({
        channel,
        moderator: interaction.member,
        reason,
      });

      const settings = await guildService.getGuild(interaction.guild.id);
      const caseNumber = settings?.moderation?.caseNumber || 0;

      await interaction.editReply({
        embeds: [{
          title: `${EMOJIS.UNLOCK} Channel Unlocked`,
          color: COLORS.SUCCESS,
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
        content: `${EMOJIS.ERROR} Failed to unlock channel: ${error.message}`,
      });
    }
  },
};