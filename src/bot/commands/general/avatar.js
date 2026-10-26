/**
 * Avatar Command - Display user's avatar
 */
import { SlashCommandBuilder } from 'discord.js';
import { COLORS, EMOJIS } from '../../config/constants.js';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Display a user\'s avatar')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to get the avatar from (defaults to yourself)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('format')
        .setDescription('The format of the avatar')
        .setRequired(false)
        .addChoices(
          { name: 'PNG', value: 'png' },
          { name: 'JPG', value: 'jpg' },
          { name: 'WEBP', value: 'webp' },
          { name: 'GIF (if animated)', value: 'gif' }
        )
    )
    .addIntegerOption(option =>
      option.setName('size')
        .setDescription('The size of the avatar (16-4096, must be power of 2)')
        .setRequired(false)
        .setMinValue(16)
        .setMaxValue(4096)
    ),

  category: 'general',
  cooldown: 5,
  permissions: { user: [], bot: [] },
  guildOnly: false,

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const format = interaction.options.getString('format') || 'webp';
    const size = interaction.options.getInteger('size') || 512;

    const avatarURL = targetUser.displayAvatarURL({
      format,
      size,
      dynamic: true,
    });

    const embed = {
      title: `${EMOJIS.USER} ${targetUser.tag}'s Avatar`,
      color: COLORS.PRIMARY,
      image: { url: avatarURL },
      fields: [
        { name: 'Format', value: format.toUpperCase(), inline: true },
        { name: 'Size', value: `${size}x${size}`, inline: true },
        { name: 'Animated', value: targetUser.avatar?.startsWith('a_') ? 'Yes' : 'No', inline: true },
      ],
      timestamp: new Date(),
      footer: { text: `Requested by ${interaction.user.tag}` },
    };

    await interaction.reply({
      embeds: [embed],
      components: [
        {
          type: 1, // ActionRow
          components: [
            {
              type: 2, // Button
              style: 5, // Link
              label: 'Download Avatar',
              url: avatarURL,
            },
          ],
        },
      ],
    });
  },
};