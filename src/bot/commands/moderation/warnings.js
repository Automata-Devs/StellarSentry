/**
 * Warnings Command - View warnings for a user
 */
import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from '../../config/constants.js';
import { memberRepository } from '../../database/repositories/MemberRepository.js';
import { Warning } from '../../database/models/Warning.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check warnings for')
        .setRequired(true)
    ),

  category: 'moderation',
  cooldown: 5,
  permissions: { user: ['ModerateMembers'], bot: ['SendMessages'] },
  guildOnly: true,

  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(target.id);

    if (!member) {
      return interaction.reply({
        content: `${EMOJIS.ERROR} That user is not in this server.`,
        ephemeral: true,
      });
    }

    // Get warnings from database
    const memberData = await memberRepository.getByGuildAndUser(interaction.guild.id, target.id);
    const warnings = memberData?.warnings || [];

    // Also get standalone warning records for more detail
    const warningDocs = await Warning.find({ guildId: interaction.guild.id, userId: target.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    if (warnings.length === 0 && warningDocs.length === 0) {
      return interaction.reply({
        embeds: [{
          title: `${EMOJIS.INFO} No Warnings`,
          color: COLORS.INFO,
          description: `${target.tag} has no warnings in this server.`,
          timestamp: new Date(),
        }],
        ephemeral: true,
      });
    }

    // Combine warnings from both sources, using warningDocs for detail
    const allWarnings = warningDocs.length > 0 ? warningDocs : warnings;

    // Pagination
    let page = 0;
    const perPage = 5;
    const totalPages = Math.ceil(allWarnings.length / perPage);

    const generateEmbed = (pageIndex) => {
      const start = pageIndex * perPage;
      const end = start + perPage;
      const pageWarnings = allWarnings.slice(start, end);

      return {
        title: `${EMOJIS.MODERATION} Warnings for ${target.tag}`,
        color: COLORS.WARNING,
        fields: pageWarnings.map((warn, index) => ({
          name: `Warning #${start + index + 1} (Case #${warn.caseNumber || 'N/A'})`,
          value: [
            `**Reason:** ${warn.reason || 'No reason provided'}`,
            `**Moderator:** <@${warn.moderatorId}>`,
            `**Date:** <t:${Math.floor(new Date(warn.createdAt).getTime() / 1000)}:F>`,
            warn.severity ? `**Severity:** ${warn.severity}` : '',
          ].filter(Boolean).join('\n'),
          inline: false,
        })),
        footer: { text: `Page ${pageIndex + 1} of ${totalPages} • Total: ${allWarnings.length}` },
        timestamp: new Date(),
      };
    };

    const generateButtons = (pageIndex) => {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('warnings_first')
          .setLabel('⏮️ First')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('warnings_prev')
          .setLabel('◀️ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('warnings_next')
          .setLabel('Next ▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === totalPages - 1),
        new ButtonBuilder()
          .setCustomId('warnings_last')
          .setLabel('Last ⏭️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === totalPages - 1)
      );
      return row;
    };

    const reply = await interaction.reply({
      embeds: [generateEmbed(page)],
      components: totalPages > 1 ? [generateButtons(page)] : [],
      fetchReply: true,
      ephemeral: true,
    });

    if (totalPages <= 1) return;

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async i => {
      switch (i.customId) {
        case 'warnings_first':
          page = 0;
          break;
        case 'warnings_prev':
          page = Math.max(0, page - 1);
          break;
        case 'warnings_next':
          page = Math.min(totalPages - 1, page + 1);
          break;
        case 'warnings_last':
          page = totalPages - 1;
          break;
      }
      await i.update({
        embeds: [generateEmbed(page)],
        components: [generateButtons(page)],
      });
    });

    collector.on('end', async () => {
      const disabledButtons = generateButtons(page).components.map(btn => ButtonBuilder.from(btn).setDisabled(true));
      await interaction.editReply({
        components: [new ActionRowBuilder().addComponents(disabledButtons)],
      }).catch(() => {});
    });
  },
};