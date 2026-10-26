/**
 * UserInfo Command - Display user information
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';
import { memberRepository } from '../../database/repositories/MemberRepository.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display user information')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to look up (defaults to yourself)')
        .setRequired(false)
    ),

  category: 'general',
  cooldown: 10,
  permissions: { user: [], bot: [] },
  guildOnly: false,

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild ? interaction.guild.members.cache.get(targetUser.id) : null;
    const guildMember = interaction.guild ? await client.getMember(interaction.guild.id, targetUser.id) : null;

    // Get member data from database if in a guild
    let memberData = null;
    if (interaction.guild) {
      memberData = await memberRepository.getByGuildAndUser(interaction.guild.id, targetUser.id);
    }

    const badges = targetUser.flags?.toArray().map(b => b.replace(/_/g, ' ').toLowerCase()) || [];
    const badgeEmojis = {
      'staff': '👮',
      'partner': '🤝',
      'hypesquad': '🏠',
      'bug hunter': '🐛',
      'hypesquad bravery': '🛡️',
      'hypesquad brilliance': '💡',
      'hypesquad balance': '⚖️',
      'early supporter': '💎',
      'bug hunter level 2': '🐛',
      'verified bot developer': '🤖',
      'certified moderator': '🛡️',
      'bot http interactions': '🌐',
      'active developer': '⚡',
    };

    const badgeStr = badges.map(b => badgeEmojis[b] || '🏷️').join(' ') || 'None';

    const fields = [
      { name: 'ID', value: targetUser.id, inline: true },
      { name: 'Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true },
      { name: 'Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: true },
      { name: 'Badges', value: badgeStr, inline: true },
    ];

    if (member) {
      const joinDate = member.joinedAt ? Math.floor(member.joinedAt.getTime() / 1000) : 'Unknown';
      const roles = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => `<@&${r.id}>`)
        .slice(0, 20)
        .join(' ') || 'None';

      fields.push(
        { name: 'Joined', value: joinDate !== 'Unknown' ? `<t:${joinDate}:F>` : 'Unknown', inline: true },
        { name: `Roles [${member.roles.cache.size - 1}]`, value: roles.length > 1024 ? roles.substring(0, 1021) + '...' : roles, inline: false }
      );

      if (guildMember?.isCommunicationDisabled()) {
        fields.push({
          name: 'Timeout',
          value: `Until <t:${Math.floor(guildMember.communicationDisabledUntilTimestamp / 1000)}:R>`,
          inline: true
        });
      }
    }

    if (memberData) {
      fields.push(
        { name: 'Level', value: memberData.level?.toString() || '0', inline: true },
        { name: 'XP', value: memberData.xp?.toLocaleString() || '0', inline: true },
        { name: 'Balance', value: `${EMOJIS.ECONOMY} ${memberData.balance?.toLocaleString() || '0'}`, inline: true },
        { name: 'Warnings', value: memberData.warnings?.length?.toString() || '0', inline: true }
      );
    }

    await interaction.reply({
      embeds: [{
        title: `${EMOJIS.USER} ${targetUser.tag}`,
        color: COLORS.PRIMARY,
        thumbnail: { url: targetUser.displayAvatarURL({ size: 256, dynamic: true }) },
        fields,
        timestamp: new Date(),
        footer: { text: `Requested by ${interaction.user.tag}` },
      }],
    });
  },
};