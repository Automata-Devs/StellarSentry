/**
 * Ban Command - Ban a user from the server
 */
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { moderationService } from '../../services/moderation.service.js';
import { guildService } from '../../services/guild.service.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
        .setMaxLength(512)
    )
    .addIntegerOption(option =>
      option.setName('delete_days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
    )
    .addBooleanOption(option =>
      option.setName('dm')
        .setDescription('Send a DM to the user (default: true)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  category: 'moderation',
  cooldown: 10,
  permissions: { user: ['BanMembers'], bot: ['BanMembers'] },
  guildOnly: true,

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: false });

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;
    const dm = interaction.options.getBoolean('dm') ?? true;

    const member = interaction.guild.members.cache.get(target.id);

    // Check if target is a member
    if (member) {
      // Check hierarchy
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} You cannot ban someone with a higher or equal role.`,
        });
      }

      if (!member.bannable) {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} I cannot ban this user. They may have a higher role than me.`,
        });
      }
    }

    try {
      await moderationService.ban({
        guild: interaction.guild,
        moderator: interaction.member,
        target: member || target,
        reason,
        deleteDays,
        dm,
      });

      // Get the case number
      const settings = await guildService.getGuild(interaction.guild.id);
      const caseNumber = settings?.moderation?.caseNumber || 0;

      await interaction.editReply({
        embeds: [{
          title: `${EMOJIS.SUCCESS} User Banned`,
          color: COLORS.SUCCESS,
          fields: [
            { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Case', value: `#${caseNumber}`, inline: true },
            { name: 'Messages Deleted', value: `${deleteDays} day(s)`, inline: true },
          ],
          timestamp: new Date(),
          footer: { text: `StellarSentry Moderation` },
        }],
      });
    } catch (error) {
      await interaction.editReply({
        content: `${EMOJIS.ERROR} Failed to ban user: ${error.message}`,
      });
    }
  },
};