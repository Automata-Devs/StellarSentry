/**
 * Slowmode Command - Set slowmode for a channel
 */
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { moderationService } from '../../services/moderation.service.js';
import { guildService } from '../../services/guild.service.js';
import { parseTime } from '../../utils/time.js';

export default {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for a channel')
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration of slowmode (e.g., 10s, 1m, 1h). Use "off" to disable.')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to set slowmode (defaults to current channel)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the slowmode change')
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

    const durationStr = interaction.options.getString('duration');
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

    let duration;
    if (durationStr.toLowerCase() === 'off' || durationStr.toLowerCase() === '0') {
      duration = 0;
    } else {
      duration = parseTime(durationStr);
      if (!duration || duration > LIMITS.SLOWMODE_MAX * 1000) {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} Invalid duration. Maximum is 6 hours. Use format like 10s, 1m, 1h, or "off".`,
        });
      }
    }

    try {
      await moderationService.setSlowmode({
        channel,
        moderator: interaction.member,
        duration: Math.floor(duration / 1000), // Convert to seconds
        reason,
      });

      const settings = await guildService.getGuild(interaction.guild.id);
      const caseNumber = settings?.moderation?.caseNumber || 0;

      const embed = {
        color: COLORS.SUCCESS,
        fields: [
          { name: 'Channel', value: `${channel}`, inline: true },
          { name: 'Case', value: `#${caseNumber}`, inline: true },
        ],
        timestamp: new Date(),
        footer: { text: `StellarSentry Moderation` },
      };

      if (duration === 0) {
        embed.title = `${EMOJIS.SUCCESS} Slowmode Disabled`;
        embed.fields.push({ name: 'Status', value: 'Slowmode has been disabled', inline: false });
      } else {
        embed.title = `${EMOJIS.SUCCESS} Slowmode Enabled`;
        embed.fields.push(
          { name: 'Duration', value: formatDuration(duration), inline: true },
          { name: 'Status', value: `Slowmode set to ${formatDuration(duration)}`, inline: false }
        );
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to set slowmode: ${error.message}`,
      });
    }
  },
};

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}