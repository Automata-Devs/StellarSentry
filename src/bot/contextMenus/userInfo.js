/**
 * User Info Context Menu - Right-click user to get info
 */
import { ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { memberRepository } from '../../database/repositories/MemberRepository.js';

export default {
  data: new ContextMenuCommandBuilder()
    .setName('User Info')
    .setType(ApplicationCommandType.User),

  category: 'utility',
  cooldown: 10,
  permissions: { user: [], bot: ['SendMessages', 'EmbedLinks'] },
  guildOnly: true,

  async execute(interaction, client) {
    const target = interaction.targetUser;
    const member = interaction.guild.members.cache.get(target.id);

    // Get member data from database if in a guild
    let memberData = null;
    if (interaction.guild) {
      memberData = await memberRepository.getByGuildAndUser(interaction.guild.id, target.id);
    }

    const badges = target.flags?.toArray().map(b => b.replace(/_/g, ' ').toLowerCase()) || [];
    const badgeEmojis = {
      'staff': '👮',
      'partner': '🤝',
      'hypesquad': '🏠',
      'bug hunter': '🐛',
      'hypesquad bravery': '🛡️',
      'hypesquad brilliance': '💡',
      'hypesquad balance': '⚖️',
      'early supporter': '💎',
      'verified bot developer': '🤖',
      'certified moderator': '🛡️',
      'active developer': '⚡',
    };

    const badgeStr = badges.map(b => badgeEmojis[b] || '🏷️').join(' ') || 'None';

    const fields = [
      { name: 'ID', value: target.id, inline: true },
      { name: 'Bot', value: target.bot ? 'Yes' : 'No', inline: true },
      { name: 'Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: true },
      { name: 'Badges', value: badgeStr, inline: true },
    ];

    if (member) {
      const joinDate = member.joinedAt ? Math.floor(member.joinedAt.getTime() / 1000) : 'Unknown';
      const roles = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => `<@&${r.id}>`)
        .slice(0, 15)
        .join(' ') || 'None';

      fields.push(
        { name: 'Joined', value: joinDate !== 'Unknown' ? `<t:${joinDate}:F>` : 'Unknown', inline: true },
        { name: `Roles [${member.roles.cache.size - 1}]`, value: roles.length > 1024 ? roles.substring(0, 1021) + '...' : roles, inline: false }
      );

      if (member.isCommunicationDisabled()) {
        fields.push({
          name: 'Timeout',
          value: `Until <t:${Math.floor(member.communicationDisabledUntilTimestamp / 1000)}:R>`,
          inline: true
        });
      }
    }

    if (memberData) {
      fields.push(
        { name: 'Level', value: memberData.level?.toString() || '0', inline: true },
        { name: 'XP', value: memberData.xp?.toLocaleString() || '0', inline: true },
        { name: 'Balance', value: `💰 ${memberData.balance?.toLocaleString() || '0'}`, inline: true },
        { name: 'Warnings', value: memberData.warnings?.length?.toString() || '0', inline: true }
      );
    }

    await interaction.reply({
      embeds: [{
        title: `${EMOJIS.USER} ${target.tag}`,
        color: COLORS.PRIMARY,
        thumbnail: { url: target.displayAvatarURL({ size: 256, dynamic: true }) },
        fields,
        timestamp: new Date(),
        footer: { text: `Requested by ${interaction.user.tag}` },
      }],
      ephemeral: true,
    });
  },
};