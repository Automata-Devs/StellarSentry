/**
 * Timeout Command - Timeout a user
 */
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { moderationService } from '../../services/moderation.service.js';
import { guildService } from '../../services/guild.service.js';
import { parseTime } from '../../utils/time.js';

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to timeout')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration of the timeout (e.g., 10m, 1h, 1d)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false)
        .setMaxLength(512)
    )
    .addBooleanOption(option =>
      option.setName('dm')
        .setDescription('Send a DM to the user (default: true)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  category: 'moderation',
  cooldown: 10,
  permissions: { user: ['ModerateMembers'], bot: ['ModerateMembers'] },
  guildOnly: true,

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: false });

    const target = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const dm = interaction.options.getBoolean('dm') ?? true;

    const member = interaction.guild.members.cache.get(target.id);

    if (!member) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} That user is not in this server.`,
      });
    }

    // Check hierarchy
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} You cannot timeout someone with a higher or equal role.`,
      });
    }

    if (!member.moderatable) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} I cannot timeout this user. They may have a higher role than me.`,
      });
    }

    // Parse duration
    const duration = parseTime(durationStr);
    if (!duration || duration > LIMITS.TIMEOUT_MAX) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} Invalid duration. Maximum is 28 days. Use format like 10m, 1h, 1d.`,
      });
    }

    if (member.isCommunicationDisabled()) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} This user is already timed out.`,
      });
    }

    try {
      await moderationService.timeout({
        guild: interaction.guild,
        moderator: interaction.member,
        target: member,
        duration,
        reason,
        dm,
      });

      const settings = await guildService.getGuild(interaction.guild.id);
      const caseNumber = settings?.moderation?.caseNumber || 0;

      await interaction.editReply({
        embeds: [{
          title: `${EMOJIS.SUCCESS} User Timed Out`,
          color: COLORS.SUCCESS,
          fields: [
            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Duration', value: formatDuration(duration), inline: true },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Case', value: `#${caseNumber}`, inline: true },
            { name: 'Expires', value: `<t:${Math.floor((Date.now() + duration) / 1000)}:R>`, inline: true },
          ],
          timestamp: new Date(),
          footer: { text: `StellarSentry Moderation` },
        }],
      });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to timeout user: ${error.message}`,
      });
    }
  },
};

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}