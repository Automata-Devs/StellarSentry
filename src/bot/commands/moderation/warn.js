/**
 * Warn Command - Warn a user
 */
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { moderationService } from '../../services/moderation.service.js';
import { guildService } from '../../services/guild.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true)
        .setMaxLength(512)
    )
    .addBooleanOption(option =>
      option.setName('dm')
        .setDescription('Send a DM to the user (default: true)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  category: 'moderation',
  cooldown: 5,
  permissions: { user: ['ModerateMembers'], bot: ['SendMessages'] },
  guildOnly: true,

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: false });

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
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
        content: `${EMOJIS.ERROR} You cannot warn someone with a higher or equal role.`,
      });
    }

    try {
      await moderationService.warn({
        guild: interaction.guild,
        moderator: interaction.member,
        target: member,
        reason,
        dm,
      });

      const settings = await guildService.getGuild(interaction.guild.id);
      const caseNumber = settings?.moderation?.caseNumber || 0;

      await interaction.editReply({
        embeds: [{
          title: `${EMOJIS.SUCCESS} User Warned`,
          color: COLORS.WARNING,
          fields: [
            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Case', value: `#${caseNumber}`, inline: true },
          ],
          timestamp: new Date(),
          footer: { text: `StellarSentry Moderation` },
        }],
      });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to warn user: ${error.message}`,
      });
    }
  },
};