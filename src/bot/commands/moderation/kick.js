/**
 * Kick Command - Kick a user from the server
 */
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { moderationService } from '../../services/moderation.service.js';
import { guildService } from '../../services/guild.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
        .setMaxLength(512)
    )
    .addBooleanOption(option =>
      option.setName('dm')
        .setDescription('Send a DM to the user (default: true)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  category: 'moderation',
  cooldown: 10,
  permissions: { user: ['KickMembers'], bot: ['KickMembers'] },
  guildOnly: true,

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: false });

    const target = interaction.options.getUser('user');
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
        content: `${EMOJIS.ERROR} You cannot kick someone with a higher or equal role.`,
      });
    }

    if (!member.kickable) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} I cannot kick this user. They may have a higher role than me.`,
      });
    }

    try {
      await moderationService.kick({
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
          title: `${EMOJIS.SUCCESS} User Kicked`,
          color: COLORS.SUCCESS,
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
        content: `${EMOJIS.ERROR} Failed to kick user: ${error.message}`,
      });
    }
  },
};